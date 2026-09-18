<?php

use App\Http\Controllers\Api\V1\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Api\V1\EmployeeController;
use App\Http\Controllers\Api\V1\Equipment\EquipmentController;
use App\Http\Controllers\Api\V1\Equipment\EquipmentFilterOptionsController;
use App\Http\Controllers\Api\V1\Equipment\EquipmentMaintenanceController;
use App\Http\Controllers\Api\V1\SiteController;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'message' => 'Hourie API is running',
    ]);
});

Route::prefix('v1/auth')->name('auth.')->group(function (): void {
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])
        ->middleware('throttle:login')
        ->name('login');

    Route::middleware('auth:sanctum')->group(function (): void {
        Route::get('/user', [AuthenticatedSessionController::class, 'show'])->name('user');
        Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');
    });
});

Route::prefix('v1')->middleware('auth:sanctum')->group(function (): void {
    Route::get('equipment-filter-options', EquipmentFilterOptionsController::class)
        ->name('equipment.filter-options');
    Route::apiResource('equipment', EquipmentController::class)->only(['index', 'store', 'show', 'update']);
    Route::post('equipment/{equipment}/maintenances', [EquipmentMaintenanceController::class, 'store']);
    Route::patch('equipment/{equipment}/maintenances/{maintenance}', [EquipmentMaintenanceController::class, 'update']);
    Route::delete('equipment/{equipment}/maintenances/{maintenance}', [EquipmentMaintenanceController::class, 'destroy']);
    Route::apiResource('sites', SiteController::class)->only(['index', 'store', 'show']);
    Route::apiResource('employees', EmployeeController::class)->only(['index', 'store', 'show']);
});
