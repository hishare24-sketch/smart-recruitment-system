<?php

use Illuminate\Support\Facades\Route;
use Modules\Interviewer\Http\Controllers\Api\InterviewerController;

// تُحمَّل تحت البادئة api/v1 (bootstrap/app.php)
Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('interviewers', [InterviewerController::class, 'index']);
    Route::post('interviewers/{id}/bookings', [InterviewerController::class, 'book']);
    Route::patch('bookings/{id}', [InterviewerController::class, 'updateBooking']);
});
