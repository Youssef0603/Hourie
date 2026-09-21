<?php

use App\Http\Controllers\Api\V1\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Api\V1\Auth\PasswordController;
use App\Http\Controllers\Api\V1\CatalogOptionController;
use App\Http\Controllers\Api\V1\EmployeeController;
use App\Http\Controllers\Api\V1\Equipment\EquipmentController;
use App\Http\Controllers\Api\V1\Equipment\EquipmentFilterOptionsController;
use App\Http\Controllers\Api\V1\Equipment\EquipmentImageController;
use App\Http\Controllers\Api\V1\Equipment\EquipmentImportController;
use App\Http\Controllers\Api\V1\Equipment\EquipmentMaintenanceController;
use App\Http\Controllers\Api\V1\Equipment\MaintenanceWarningController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\SiteController;
use App\Http\Middleware\EnsurePasswordWasChanged;
use App\Http\Middleware\EnsureUserIsActive;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);

Route::prefix('v1/auth')->name('auth.')->group(function (): void {
    Route::post('/login', [AuthenticatedSessionController::class, 'store'])
        ->middleware('throttle:login')
        ->name('login');

    Route::middleware(['auth:sanctum', EnsureUserIsActive::class])->group(function (): void {
        Route::get('/user', [AuthenticatedSessionController::class, 'show'])->name('user');
        Route::put('/password', [PasswordController::class, 'update'])->name('password.update');
        Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');
    });
});

Route::prefix('v1')->middleware(['auth:sanctum', EnsureUserIsActive::class, EnsurePasswordWasChanged::class])->group(function (): void {
    Route::apiResource('catalog-options', CatalogOptionController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('equipment-filter-options', EquipmentFilterOptionsController::class)
        ->name('equipment.filter-options');
    Route::post('equipment-imports', [EquipmentImportController::class, 'store'])
        ->name('equipment.imports.store');
    Route::apiResource('equipment', EquipmentController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
    Route::get('maintenance-warnings', MaintenanceWarningController::class)
        ->name('maintenance-warnings.index');
    Route::post('equipment/{equipment}/images', [EquipmentImageController::class, 'store']);
    Route::get('equipment/{equipment}/images/{image}/file', [EquipmentImageController::class, 'show'])->name('equipment.images.show');
    Route::delete('equipment/{equipment}/images/{image}', [EquipmentImageController::class, 'destroy']);
    Route::post('equipment/{equipment}/maintenances', [EquipmentMaintenanceController::class, 'store']);
    Route::patch('equipment/{equipment}/maintenances/{maintenance}', [EquipmentMaintenanceController::class, 'update']);
    Route::delete('equipment/{equipment}/maintenances/{maintenance}', [EquipmentMaintenanceController::class, 'destroy']);
    Route::apiResource('sites', SiteController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
    Route::apiResource('employees', EmployeeController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
});
