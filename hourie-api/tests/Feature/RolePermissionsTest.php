<?php

use App\Enums\UserRole;
use App\Models\Employee;
use App\Models\EmployeeProjectAssignment;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\EquipmentProjectAssignment;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

uses(LazilyRefreshDatabase::class);

beforeEach(function (): void {
    $category = EquipmentCategory::query()->firstWhere('code', 'generator')
        ?? EquipmentCategory::factory()->create(['code' => 'generator']);
    $this->bassam = Project::factory()->create(['name' => 'Bassam']);
    $this->abidjan = Project::factory()->create(['name' => 'Abidjan']);
    $this->onBassam = Equipment::factory()->create(['equipment_category_id' => $category->id, 'brand' => 'PERKINS']);
    $this->onAbidjan = Equipment::factory()->create(['equipment_category_id' => $category->id, 'brand' => 'KOHLER']);
    EquipmentProjectAssignment::factory()->for($this->onBassam)->for($this->bassam)->create(['ended_at' => null]);
    EquipmentProjectAssignment::factory()->for($this->onAbidjan)->for($this->abidjan)->create(['ended_at' => null]);
});

function accountFor(UserRole $role, ?Project $site = null): User
{
    $user = User::factory()->create(['role' => $role]);
    $employee = Employee::factory()->create(['user_id' => $user->id]);
    if ($site !== null) {
        EmployeeProjectAssignment::query()->create(['employee_id' => $employee->id, 'project_id' => $site->id, 'project_role' => 'site_manager', 'started_on' => '2026-01-01']);
    }

    return $user;
}

function maintenancePayload(): array
{
    return ['maintenance_date' => '2026-11-20', 'intervention_type' => 'mechanical'];
}

it('shows a Chef de chantier only the equipment of his own site', function () {
    $chef = accountFor(UserRole::SiteManager, $this->bassam);

    $this->actingAs($chef, 'web')->getJson('/api/v1/equipment')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $this->onBassam->id);
    $this->getJson("/api/v1/equipment/{$this->onBassam->id}")->assertOk();
    $this->getJson("/api/v1/equipment/{$this->onAbidjan->id}")->assertForbidden();
    $this->getJson('/api/v1/equipment-filter-options')
        ->assertOk()
        ->assertJsonCount(1, 'data.projects')
        ->assertJsonPath('data.projects.0.id', $this->bassam->id);
    $this->getJson('/api/v1/auth/user')->assertJsonPath('data.site_scope.id', $this->bassam->id);
});

it('lets a Chef de chantier maintain his site equipment but not move it, delete it or touch another site', function () {
    $chef = accountFor(UserRole::SiteManager, $this->bassam);
    $this->actingAs($chef, 'web');

    $this->postJson("/api/v1/equipment/{$this->onBassam->id}/maintenances", maintenancePayload())->assertCreated();
    $this->postJson("/api/v1/equipment/{$this->onAbidjan->id}/maintenances", maintenancePayload())->assertForbidden();
    $this->postJson("/api/v1/equipment/{$this->onBassam->id}/transfer", ['from_project_id' => $this->bassam->id, 'to_project_id' => $this->abidjan->id])->assertForbidden();
    $this->deleteJson("/api/v1/equipment/{$this->onBassam->id}")->assertForbidden();
});

it('sees nothing when the Chef de chantier has no site in Personnel', function () {
    $this->actingAs(accountFor(UserRole::SiteManager), 'web')
        ->getJson('/api/v1/equipment')->assertOk()->assertJsonCount(0, 'data');
});

it('closes the company-wide modules to a Chef de chantier', function (string $path) {
    $this->actingAs(accountFor(UserRole::SiteManager, $this->bassam), 'web')->getJson($path)->assertForbidden();
})->with(['/api/v1/purchase-orders', '/api/v1/insurance-policies', '/api/v1/bonds', '/api/v1/temporary-admissions', '/api/v1/employees', '/api/v1/sites', '/api/v1/dashboard', '/api/v1/notification-settings']);

it('lets the Responsable matériel transfer equipment between sites but not manage insurance or orders', function () {
    $this->actingAs(accountFor(UserRole::EquipmentManager), 'web');

    $this->postJson("/api/v1/equipment/{$this->onBassam->id}/transfer", [
        'from_project_id' => $this->bassam->id,
        'to_project_id' => $this->abidjan->id,
    ])->assertOk();
    $this->postJson('/api/v1/insurance-policies', ['insurance_type' => 'equipment', 'policy_number' => 'X'])->assertForbidden();
    $this->postJson('/api/v1/purchase-orders', [])->assertForbidden();
});

it('lets the Mécanicien record maintenance on any machine and nothing else', function () {
    $this->actingAs(accountFor(UserRole::Mechanic), 'web');

    $this->postJson("/api/v1/equipment/{$this->onAbidjan->id}/maintenances", maintenancePayload())->assertCreated();
    $this->postJson("/api/v1/equipment/{$this->onAbidjan->id}/transfer", ['from_project_id' => $this->abidjan->id, 'to_project_id' => $this->bassam->id])->assertForbidden();
    $this->deleteJson("/api/v1/equipment/{$this->onAbidjan->id}")->assertForbidden();
    $this->getJson('/api/v1/auth/user')
        ->assertJsonPath('data.permissions.manage_maintenance', true)
        ->assertJsonPath('data.permissions.manage_equipment', false);
});

it('lets the Acheteur manage purchase orders but not equipment', function () {
    $this->actingAs(accountFor(UserRole::Purchaser), 'web');

    $this->getJson('/api/v1/auth/user')
        ->assertJsonPath('data.permissions.manage_purchase_orders', true)
        ->assertJsonPath('data.permissions.manage_equipment', false)
        ->assertJsonPath('data.site_scope', null);
    $this->postJson("/api/v1/equipment/{$this->onAbidjan->id}/maintenances", maintenancePayload())->assertForbidden();
    $this->getJson('/api/v1/purchase-orders')->assertOk();
});
