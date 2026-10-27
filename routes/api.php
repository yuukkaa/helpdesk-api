<?php

use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\TicketController;
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

Route::prefix('v1')->name('v1.')->group(function () {
    // Группа подготовлена для middleware: auth:sanctum и проверка ролей (ПР8)

    Route::apiResource('categories', CategoryController::class);

    Route::apiResource('tickets', TicketController::class);
    Route::post('tickets/{ticket}/assign', [TicketController::class, 'assign'])
        ->name('tickets.assign');
    Route::patch('tickets/{ticket}/status', [TicketController::class, 'changeStatus'])
        ->name('tickets.status');
});