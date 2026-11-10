<?php

use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\KnowledgeBaseArticleController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\StatisticsController;
use App\Http\Controllers\Api\TagController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// Проверка работоспособности сервиса (Healthcheck)
Route::get('/health', function () {
    try {
        DB::select('select 1');
        $dbOk = true;
    } catch (\Throwable) {
        $dbOk = false;
    }

    return response()->json([
        'app' => config('app.name'),
        'time' => now()->toIso8601String(),
        'database' => $dbOk ? 'ok' : 'unavailable',
    ], $dbOk ? 200 : 503);
});

$registerApiRoutes = function (): void {
    // 1. Публичные маршруты аутентификации
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    // 2. Защищённые маршруты (требуется Bearer-токен Sanctum)
    Route::middleware('auth:sanctum')->group(function (): void {
        // Профиль и выход
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [AuthController::class, 'me']);
        Route::get('/me', [AuthController::class, 'me']);

        // Категории: просмотр всем авторизованным, изменение — только admin
        Route::get('/categories', [CategoryController::class, 'index']);
        Route::get('/categories/{category}', [CategoryController::class, 'show']);
        Route::middleware('role:admin')->group(function (): void {
            Route::post('/categories', [CategoryController::class, 'store']);
            Route::put('/categories/{category}', [CategoryController::class, 'update']);
            Route::patch('/categories/{category}', [CategoryController::class, 'update']);
            Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);
        });

        // База знаний: просмотр всем авторизованным (клиент видит только опубликованные), управление — support, admin
        Route::get('/knowledge-base-articles', [KnowledgeBaseArticleController::class, 'index']);
        Route::get('/knowledge-base-articles/{article}', [KnowledgeBaseArticleController::class, 'show']);
        Route::get('/kb/articles', [KnowledgeBaseArticleController::class, 'index']);
        Route::get('/kb/articles/{article}', [KnowledgeBaseArticleController::class, 'show']);
        Route::get('/articles', [KnowledgeBaseArticleController::class, 'index']);
        Route::get('/articles/{article}', [KnowledgeBaseArticleController::class, 'show']);
        Route::get('/kb', [KnowledgeBaseArticleController::class, 'index']);
        Route::get('/kb/{article}', [KnowledgeBaseArticleController::class, 'show']);

        Route::middleware('role:support,admin')->group(function (): void {
            Route::post('/knowledge-base-articles', [KnowledgeBaseArticleController::class, 'store']);
            Route::put('/knowledge-base-articles/{article}', [KnowledgeBaseArticleController::class, 'update']);
            Route::patch('/knowledge-base-articles/{article}', [KnowledgeBaseArticleController::class, 'update']);
            Route::delete('/knowledge-base-articles/{article}', [KnowledgeBaseArticleController::class, 'destroy']);
        });

        // Статистика и экспорт заявок в CSV (support, admin)
        Route::middleware('role:support,admin')->group(function (): void {
            Route::get('/statistics/tickets', [StatisticsController::class, 'tickets']);
            Route::get('/tickets/stats', [TicketController::class, 'stats']);
            Route::get('/stats', [TicketController::class, 'stats']);
            Route::get('/tickets/export/csv', [TicketController::class, 'exportCsv']);
        });

        // Заявки (Tickets)
        Route::get('/tickets', [TicketController::class, 'index']);
        Route::post('/tickets', [TicketController::class, 'store']);
        Route::get('/tickets/{ticket}', [TicketController::class, 'show'])->whereNumber('ticket');

        // Переписка по заявке (Messages)
        Route::get('/tickets/{ticket}/messages', [MessageController::class, 'index'])->whereNumber('ticket');
        Route::post('/tickets/{ticket}/messages', [MessageController::class, 'store'])->whereNumber('ticket');

        // Действия специалистов поддержки и администратора
        Route::middleware('role:support,admin')->group(function (): void {
            Route::put('/tickets/{ticket}', [TicketController::class, 'update'])->whereNumber('ticket');
            Route::patch('/tickets/{ticket}', [TicketController::class, 'update'])->whereNumber('ticket');
            Route::post('/tickets/{ticket}/assign', [TicketController::class, 'assign'])->whereNumber('ticket');
            Route::patch('/tickets/{ticket}/status', [TicketController::class, 'changeStatus'])->whereNumber('ticket');

            // Управление метками заявки
            Route::post('/tickets/{ticket}/tags', [TicketController::class, 'attachTag'])->whereNumber('ticket');
            Route::put('/tickets/{ticket}/tags', [TicketController::class, 'syncTags'])->whereNumber('ticket');
            Route::delete('/tickets/{ticket}/tags/{tag}', [TicketController::class, 'detachTag'])->whereNumber('ticket');

            // Справочник меток
            Route::get('/tags', [TagController::class, 'index']);
            Route::post('/tags', [TagController::class, 'store']);
            Route::delete('/tags/{tag}', [TagController::class, 'destroy']);

            // ИИ-черновик ответа для специалиста
            Route::post('/tickets/{ticket}/ai-draft', [AiController::class, 'draftReply'])
                ->whereNumber('ticket')
                ->withoutMiddleware(['throttle', 'throttle:api', 'throttle:ai']);
        });

        // Действия только для администратора (role:admin)
        Route::middleware('role:admin')->group(function (): void {
            Route::delete('/tickets/{ticket}', [TicketController::class, 'destroy'])->whereNumber('ticket');
            Route::apiResource('users', UserController::class)->except(['show']);
        });

        // ИИ-классификация при создании заявки (доступна всем авторизованным)
        Route::post('/ai/suggest-ticket', [AiController::class, 'suggest'])
            ->withoutMiddleware(['throttle', 'throttle:api', 'throttle:ai']);
    });
};

// Корневые маршруты /api/* (для клиентского приложения по заданию)
$registerApiRoutes();

// Версионированные маршруты /api/v1/* (для обратной совместимости и коллекции Postman/Bruno)
Route::prefix('v1')->name('v1.')->group($registerApiRoutes);
