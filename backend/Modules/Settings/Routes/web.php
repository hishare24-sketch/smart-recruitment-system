<?php

use Illuminate\Support\Facades\Route;
use Modules\Settings\Http\Controllers\Admin\AdminSettingController;

// تُحمَّل تحت البادئة api/admin + [auth:sanctum, admin] (bootstrap/app.php).

Route::get('settings', [AdminSettingController::class, 'index']);
Route::put('settings', [AdminSettingController::class, 'update']);
