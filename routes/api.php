<?php

use App\Http\Controllers\Api\AiController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\KnowledgeBaseController;
use App\Http\Controllers\Api\MessageController;
use App\Http\Controllers\Api\TagController;
use App\Http\Controllers\Api\TicketController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Пользователи и справочники
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/tags', [TagController::class, 'index']);

    // Заявки (Tickets)
    Route::get('/tickets', [TicketController::class, 'index']);
    Route::post('/tickets', [TicketController::class, 'store']);
    Route::get('/tickets/{ticket}', [TicketController::class, 'show']);
    Route::delete('/tickets/{ticket}', [TicketController::class, 'destroy']);

    // Управление заявкой
    Route::post('/tickets/{ticket}/assign', [TicketController::class, 'assign']);
    Route::patch('/tickets/{ticket}/status', [TicketController::class, 'changeStatus']);
    Route::post('/tickets/{ticket}/tags', [TicketController::class, 'attachTag']);
    Route::delete('/tickets/{ticket}/tags/{tag}', [TicketController::class, 'detachTag']);

    // Переписка
    Route::get('/tickets/{ticket}/messages', [MessageController::class, 'index']);
    Route::post('/tickets/{ticket}/messages', [MessageController::class, 'store']);

    // База знаний (все возможные пути фронтенда)
    Route::get('/articles', [KnowledgeBaseController::class, 'index']);
    Route::get('/articles/{article}', [KnowledgeBaseController::class, 'show']);
    Route::get('/kb/articles', [KnowledgeBaseController::class, 'index']);
    Route::get('/kb/articles/{article}', [KnowledgeBaseController::class, 'show']);
    Route::get('/kb', [KnowledgeBaseController::class, 'index']);
    Route::get('/kb/{article}', [KnowledgeBaseController::class, 'show']);
    Route::get('/knowledge-base', [KnowledgeBaseController::class, 'index']);
    Route::get('/knowledge-base/{article}', [KnowledgeBaseController::class, 'show']);

    // ИИ маршруты
    Route::post('/ai/suggest-ticket', [AiController::class, 'suggest']);
    Route::post('/tickets/{ticket}/ai-draft', [AiController::class, 'draftReply']);
});