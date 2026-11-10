<?php

use App\Exceptions\BusinessException;
use App\Http\Middleware\EnsureUserHasRole;
use App\Http\Middleware\LogApiRequests;
use App\Models\{Category, KnowledgeBaseArticle, Message, Tag, Ticket, User};
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => EnsureUserHasRole::class,
        ]);

        // Запись каждого запроса к API (метод, URL, id пользователя, код ответа, время выполнения)
        $middleware->api(append: [
            LogApiRequests::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->dontReport([
            BusinessException::class,
        ]);

        $exceptions->shouldRenderJsonWhen(
            fn (Request $request, Throwable $e) => $request->is('api/*') || $request->expectsJson()
        );

        // 422: ошибки валидации
        $exceptions->render(function (ValidationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'message' => 'Ошибка валидации',
                'errors' => $e->errors(),
            ], 422);
        });

        // 401: нет токена или токен недействителен
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json(['message' => 'Требуется авторизация.'], 401);
        });

        // 409 или 422: нарушение бизнес-правила
        $exceptions->render(function (BusinessException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            Log::warning('Нарушение бизнес-правила', [
                'message' => $e->getMessage(),
                'status' => $e->status(),
                'user_id' => $request->user()?->id,
                'url' => $request->fullUrl(),
            ]);

            return response()->json(['message' => $e->getMessage()], $e->status());
        });

        // 404: запись или маршрут не найден
        $exceptions->render(function (NotFoundHttpException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            $messages = [
                Ticket::class => 'Заявка не найдена.',
                Category::class => 'Категория не найдена.',
                Tag::class => 'Метка не найдена.',
                Message::class => 'Сообщение не найдено.',
                KnowledgeBaseArticle::class => 'Статья не найдена.',
                User::class => 'Пользователь не найден.',
            ];

            $previous = $e->getPrevious();

            $message = $previous instanceof ModelNotFoundException
                ? ($messages[$previous->getModel()] ?? 'Запись не найдена.')
                : 'Ресурс не найден.';

            return response()->json(['message' => $message], 404);
        });

        // Нарушения целостности БД: 409 или 422 вместо 500
        $exceptions->render(function (QueryException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return match ($e->errorInfo[1] ?? null) {
                1451 => response()->json([
                    'message' => 'Запись используется в других данных и не может быть удалена.',
                ], 409),
                1452 => response()->json([
                    'message' => 'Ошибка валидации',
                    'errors' => ['relation' => ['Указана несуществующая связанная запись.']],
                ], 422),
                1062 => response()->json([
                    'message' => 'Ошибка валидации',
                    'errors' => ['unique' => ['Запись с такими данными уже существует.']],
                ], 422),
                default => null,
            };
        });

        // Остальные ошибки: 403, 405, 429, 500 и т. д. (без стека и SQL)
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            $status = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 500;

            if ($status >= 500) {
                Log::error('Внутренняя ошибка API', [
                    'exception' => get_class($e),
                    'message' => $e->getMessage(),
                    'user_id' => $request->user()?->id,
                    'url' => $request->fullUrl(),
                ]);
            }

            if ($status >= 500 && config('app.debug')) {
                return null;
            }

            $message = match (true) {
                $status === 403 => 'Доступ запрещён.',
                $status === 404 => 'Ресурс не найден.',
                $status === 405 => 'Метод не поддерживается.',
                $status === 409 => $e->getMessage() ?: 'Конфликт данных.',
                $status === 429 => 'Слишком много запросов.',
                $status >= 500 => 'Внутренняя ошибка сервера.',
                default => $e->getMessage() ?: 'Ошибка запроса.',
            };

            return response()->json(['message' => $message], $status);
        });
    })->create();
