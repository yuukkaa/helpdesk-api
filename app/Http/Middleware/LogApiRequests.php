<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class LogApiRequests
{
    /**
     * Список чувствительных полей, которые никогда не должны попадать в лог.
     *
     * @var list<string>
     */
    private const SENSITIVE_KEYS = [
        'password',
        'password_confirmation',
        'current_password',
        'token',
        'api_token',
        'access_token',
        'refresh_token',
        'secret',
    ];

    /**
     * Записывает каждый запрос к API в журнал (метод, URL, id пользователя, код ответа, время выполнения).
     */
    public function handle(Request $request, Closure $next): Response
    {
        $startTime = microtime(true);

        /** @var Response $response */
        $response = $next($request);

        $durationMs = round((microtime(true) - $startTime) * 1000, 2);

        // Исключаем пароли, токены и файлы из логируемых параметров
        $safeInput = $request->except(self::SENSITIVE_KEYS);
        foreach (array_keys($request->allFiles()) as $fileKey) {
            unset($safeInput[$fileKey]);
        }

        Log::info('API Request', [
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'user_id' => $request->user()?->id,
            'status' => $response->getStatusCode(),
            'duration_ms' => $durationMs,
            'ip' => $request->ip(),
            'params' => $safeInput,
        ]);

        return $response;
    }
}
