<?php

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