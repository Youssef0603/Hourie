<?php

use App\Enums\UserRole;
use App\Models\Employee;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

uses(LazilyRefreshDatabase::class);

it('requires authentication to view the executive dashboard', function (): void {
    $this->getJson('/api/v1/dashboard')->assertUnauthorized();
});

it('returns compact executive metrics and operational sections', function (): void {
    $user = User::factory()->create(['role' => UserRole::Manager, 'must_change_password' => false, 'is_active' => true]);
    $employee = Employee::factory()->create(['is_active' => true]);
    $project = Project::factory()->create(['is_active' => true, 'responsible_employee_id' => null]);
    $category = EquipmentCategory::query()->create(['code' => 'dashboard_test', 'name' => 'Dashboard test', 'is_active' => true]);
    Equipment::factory()->create(['equipment_category_id' => $category->id, 'is_active' => true, 'serial_number' => null]);

    $this->actingAs($user, 'web')->getJson('/api/v1/dashboard')
        ->assertOk()
        ->assertJsonPath('data.summary.active_sites', 1)
        ->assertJsonPath('data.summary.active_equipment', 1)
        ->assertJsonPath('data.summary.active_people', 1)
        ->assertJsonPath('data.project_health.0.id', $project->id)
        ->assertJsonPath('data.project_health.0.alert_count', 1)
        ->assertJsonPath('data.project_health.0.alerts.0.type', 'responsible')
        ->assertJsonStructure(['data' => [
            'generated_at', 'summary', 'urgent_actions', 'deadlines',
            'equipment_status', 'equipment_categories', 'project_health',
        ]]);
});
