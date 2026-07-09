<?php

use Illuminate\Support\Facades\Route;
use Modules\Survey\Http\Controllers\Api\SurveyController;

// تُحمَّل تحت البادئة api/v1 (bootstrap/app.php)
Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('surveys', [SurveyController::class, 'index']);
    Route::post('surveys', [SurveyController::class, 'store']);
    Route::post('surveys/{id}/responses', [SurveyController::class, 'respond']);
});
