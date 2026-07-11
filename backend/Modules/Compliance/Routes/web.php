<?php

use Illuminate\Support\Facades\Route;
use Modules\Compliance\Http\Controllers\Admin\AdminComplianceController;

// تُحمَّل تحت البادئة api/admin + [auth:sanctum, admin] (bootstrap/app.php). العدالة والامتثال (B4).

Route::get('compliance/overview', [AdminComplianceController::class, 'overview']);
Route::get('compliance/adverse-impact', [AdminComplianceController::class, 'adverseImpact']);
Route::get('compliance/funnel', [AdminComplianceController::class, 'funnel']);
Route::get('compliance/ai-oversight', [AdminComplianceController::class, 'aiOversight']);
Route::get('compliance/audit-trail', [AdminComplianceController::class, 'auditTrail']);
