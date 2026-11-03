<?php

use App\Enums\EquipmentChangeSource;
use App\Enums\EquipmentChangeType;
use App\Enums\UserRole;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\EquipmentChange;
use App\Models\EquipmentMaintenance;
use App\Models\EquipmentProjectAssignment;
use App\Models\GeneratorDetail;
use App\Models\Location;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

uses(LazilyRefreshDatabase::class);

it('requires authentication to view the operational dashboard', function (): void {
    $this->getJson('/api/v1/dashboard')->assertUnauthorized();
});

it('returns the executive equipment dashboard', function (): void {
    $user = User::factory()->create(['role' => UserRole::Manager, 'must_change_password' => false, 'is_active' => true]);
    $category = EquipmentCategory::query()->create(['code' => 'generator', 'name' => 'Générateurs', 'is_active' => true]);
    $location = Location::factory()->create();
    $project = Project::factory()->create();

    $repair = Equipment::factory()->create([
        'equipment_category_id' => $category->id,
        'current_location_id' => $location->id,
        'condition' => 'defective',
        'usage_status' => 'in_use',
        'purchase_date' => '2026-01-01',
        'supplier' => 'Fournisseur',
        'origin' => 'Côte d’Ivoire',
    ]);
    $unknown = Equipment::factory()->create([
        'equipment_category_id' => $category->id,
        'current_location_id' => null,
        'serial_number' => null,
        'usage_status' => null,
    ]);
    $maintenanceEquipment = Equipment::factory()->create([
        'equipment_category_id' => $category->id,
        'current_location_id' => $location->id,
    ]);
    $assignedWithoutPhysicalLocation = Equipment::factory()->create([
        'equipment_category_id' => $category->id,
        'current_location_id' => null,
    ]);
    EquipmentProjectAssignment::factory()->for($repair)->for($project)->create();
    EquipmentProjectAssignment::factory()->for($maintenanceEquipment)->for($project)->create();
    EquipmentProjectAssignment::factory()->for($assignedWithoutPhysicalLocation)->for($project)->create();
    GeneratorDetail::factory()->for($maintenanceEquipment)->create(['current_engine_hours' => 1490]);
    EquipmentMaintenance::factory()->for($maintenanceEquipment)->create([
        'engine_hours' => 1250,
        'maintenance_interval_hours' => 250,
        'next_maintenance_engine_hours' => 1500,
    ]);
    EquipmentChange::factory()->for($repair)->create([
        'change_type' => EquipmentChangeType::LocationChanged,
        'source' => EquipmentChangeSource::Transfer,
        'previous_values' => ['location' => 'Bureau'],
        'new_values' => ['location' => 'Gesco'],
        'occurred_at' => now()->subDay(),
    ]);
    EquipmentChange::factory()->for($assignedWithoutPhysicalLocation)->create([
        'change_type' => EquipmentChangeType::ProjectAssignmentChanged,
        'source' => EquipmentChangeSource::Manual,
        'previous_values' => ['project' => null],
        'new_values' => ['project' => $project->name],
        'occurred_at' => now()->subDay(),
    ]);

    $this->actingAs($user, 'web')->getJson('/api/v1/dashboard')
        ->assertOk()
        ->assertJsonPath('data.summary.active_equipment', 4)
        ->assertJsonPath('data.summary.active_projects', 1)
        ->assertJsonPath('data.priority_actions.0.key', 'repair')
        ->assertJsonPath('data.priority_actions.0.title', '1 équipements à réparer')
        ->assertJsonPath('data.priority_actions.1.key', 'maintenance')
        ->assertJsonPath('data.priority_actions.1.title', '1 maintenances à planifier')
        ->assertJsonPath('data.data_quality.missing_serials', 1)
        ->assertJsonPath('data.data_quality.missing_projects', 1)
        ->assertJsonCount(2, 'data.recent_activity')
        ->assertJsonStructure(['data' => [
            'generated_at', 'summary', 'priority_actions', 'deadlines', 'data_quality', 'recent_activity',
        ]]);
});
