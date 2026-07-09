<?php

use Illuminate\Support\Facades\Route;
use Modules\Account\Http\Controllers\Api\AccountController;

// تُحمَّل تحت البادئة api/v1 (bootstrap/app.php)
Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('wallet', [AccountController::class, 'wallet']);
    Route::get('account/plan', [AccountController::class, 'plan']);
    Route::put('account/plan', [AccountController::class, 'setPlan']);
});
