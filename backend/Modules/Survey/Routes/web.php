<?php

use Illuminate\Support\Facades\Route;
use Modules\Survey\Http\Controllers\Admin\AdminSurveyController;
use Modules\Survey\Http\Controllers\Admin\AdminSurveyTemplateController;

// تُحمَّل تحت البادئة api/admin + [auth:sanctum, admin] (bootstrap/app.php).

Route::get('surveys/stats', [AdminSurveyController::class, 'stats']);
Route::get('surveys', [AdminSurveyController::class, 'index']);
Route::post('surveys/{survey}/close', [AdminSurveyController::class, 'close']);
Route::delete('surveys/{survey}', [AdminSurveyController::class, 'destroy']);

// مكتبة نماذج الاستبيانات
Route::get('survey-templates/stats', [AdminSurveyTemplateController::class, 'stats']);
Route::get('survey-templates', [AdminSurveyTemplateController::class, 'index']);
Route::post('survey-templates', [AdminSurveyTemplateController::class, 'store']);
Route::put('survey-templates/{surveyTemplate}', [AdminSurveyTemplateController::class, 'update']);
Route::delete('survey-templates/{surveyTemplate}', [AdminSurveyTemplateController::class, 'destroy']);
