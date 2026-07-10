<?php

use Illuminate\Support\Facades\Route;
use Modules\Account\Http\Controllers\Admin\AdminPlanController;
use Modules\Account\Http\Controllers\Admin\AdminWalletController;

// تُحمَّل تحت البادئة api/admin + [auth:sanctum, admin] (bootstrap/app.php).

Route::get('wallets', [AdminWalletController::class, 'index']);
Route::post('wallets/{wallet}/adjust', [AdminWalletController::class, 'adjust']);

Route::get('plans/stats', [AdminPlanController::class, 'stats']);
Route::get('plans', [AdminPlanController::class, 'index']);
Route::post('plans', [AdminPlanController::class, 'store']);
Route::put('plans/{plan}', [AdminPlanController::class, 'update']);
Route::delete('plans/{plan}', [AdminPlanController::class, 'destroy']);
