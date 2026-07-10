<?php

use Illuminate\Support\Facades\Route;
use Modules\Interviewer\Http\Controllers\Admin\AdminInterviewerController;

// تُحمَّل تحت البادئة api/admin + [auth:sanctum, admin] (bootstrap/app.php).

Route::get('interviewers', [AdminInterviewerController::class, 'index']);
Route::post('interviewers/{interviewer}/approve', [AdminInterviewerController::class, 'approve']);
Route::post('interviewers/{interviewer}/reject', [AdminInterviewerController::class, 'reject']);
Route::delete('interviewers/{interviewer}', [AdminInterviewerController::class, 'destroy']);
