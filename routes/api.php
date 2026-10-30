<?php

use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\KnowledgeBaseArticleController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\TagController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get('/health', function () {
    try {
        DB::select('select 1');
        $dbOk = true;
    } catch (\Throwable $e) {
        $dbOk = false;
    }

    return response()->json([
        'app' => config('app.name'),
        'time' => now()->toIso8601String(),
        'database' => $dbOk ? 'ok' : 'unavailable',
    ], $dbOk ? 200 : 503);
});

Route::middleware('throttle:60,1')->prefix('v1')->name('v1.')->group(function () {
    // Сюда в ПР8 добавятся auth:sanctum и проверка ролей

    Route::apiResource('categories', CategoryController::class);

    Route::apiResource('tickets', TicketController::class);
    Route::post('tickets/{ticket}/assign', [TicketController::class, 'assign'])
        ->name('tickets.assign');
    Route::patch('tickets/{ticket}/status', [TicketController::class, 'changeStatus'])
        ->name('tickets.status');

    // Метки заявки (связь «многие ко многим»)
    Route::post('tickets/{ticket}/tags', [TicketController::class, 'attachTags'])
        ->name('tickets.tags.attach');
    Route::put('tickets/{ticket}/tags', [TicketController::class, 'syncTags'])
        ->name('tickets.tags.sync');
    Route::delete('tickets/{ticket}/tags/{tag}', [TicketController::class, 'detachTag'])
        ->name('tickets.tags.detach');

    // Переписка по заявке (вложенный ресурс)
    Route::apiResource('tickets.messages', MessageController::class)
        ->only(['index', 'store']);

    Route::apiResource('tags', TagController::class)
        ->only(['index', 'store', 'destroy']);

    Route::apiResource('knowledge-base-articles', KnowledgeBaseArticleController::class)
        ->parameters(['knowledge-base-articles' => 'article']);

    Route::apiResource('users', UserController::class)
        ->except(['show']);
});

// ВРЕМЕННЫЙ маршрут для проверки ошибки 500. Удалить после скриншота (шаг 11)
Route::get('/debug/error', fn () => throw new \RuntimeException('Тестовая ошибка'));