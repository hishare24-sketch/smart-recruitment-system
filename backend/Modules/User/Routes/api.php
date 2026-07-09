<?php

use Illuminate\Support\Facades\Route;
use Modules\User\Http\Controllers\Api\AuthController;

// يُحمَّل تحت البادئة api/v1 (bootstrap/app.php)
Route::post('auth/register', [AuthController::class, 'register']);
Route::post('auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('auth/me', [AuthController::class, 'me']);
    Route::post('auth/logout', [AuthController::class, 'logout']);
});
