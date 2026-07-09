<?php

use Illuminate\Support\Facades\Route;
use Modules\Interview\Http\Controllers\Api\InterviewController;

// تُحمَّل تحت البادئة api/v1 (bootstrap/app.php)
Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('interviews', [InterviewController::class, 'index']);
    Route::post('interviews', [InterviewController::class, 'store']);
});
