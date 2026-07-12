<?php

use Illuminate\Support\Facades\Route;
use Modules\Quality\Http\Controllers\Admin\AdminQualityController;

// تُحمَّل تحت البادئة api/admin + [auth:sanctum, admin] (bootstrap/app.php).
// مركز قيادة الجودة — اللوحة الذرّية (ف1: قراءة حالات الاختبار).

Route::get('quality/overview', [AdminQualityController::class, 'overview']);
Route::get('quality/atoms', [AdminQualityController::class, 'atoms']);
