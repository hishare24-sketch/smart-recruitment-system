<?php

use Illuminate\Support\Facades\Route;
use Modules\Governance\Http\Controllers\Admin\AdminModerationController;

// تُحمَّل تحت البادئة api/admin + [auth:sanctum, admin] (bootstrap/app.php).

Route::get('moderation/stats', [AdminModerationController::class, 'stats']);
Route::get('moderation', [AdminModerationController::class, 'index']);
Route::post('moderation/{item}/resolve', [AdminModerationController::class, 'resolve']);
