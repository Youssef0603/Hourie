<?php

use App\Enums\EquipmentChangeSource;
use App\Enums\EquipmentChangeType;
use App\Enums\UserRole;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\EquipmentChange;
use App\Models\EquipmentMaintenance;
use App\Models\GeneratorDetail;
use App\Models\Location;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

uses(LazilyRefreshDatabase::class);

it('requires authentication to view the operational dashboard', function (): void {
    $this->getJson('/api/v1/dashboard')->assertUnauthorized();
});

it('returns the six operational equipment queues', function (): void {
    $user = User::factory()->create(['role' => UserRole::Manager, 'must_change_password' => false, 'is_active' => true]);
    $category = EquipmentCategory::query()->create(['code' => 'generator', 'name' => 'Générateurs', 'is_active' => true]);
    $location = Location::factory()->create();

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

    $this->actingAs($user, 'web')->getJson('/api/v1/dashboard')
        ->assertOk()
        ->assertJsonPath('data.sections.repair_required.total', 1)
        ->assertJsonPath('data.sections.unknown_location.total', 1)
        ->assertJsonPath('data.sections.maintenance_by_hours.total', 1)
        ->assertJsonPath('data.sections.maintenance_by_hours.items.0.hours_remaining', 10)
        ->assertJsonPath('data.sections.recent_transfers.total', 1)
        ->assertJsonPath('data.sections.recent_transfers.items.0.to', 'Gesco')
        ->assertJsonFragment(['asset_code' => $repair->asset_code])
        ->assertJsonFragment(['asset_code' => $unknown->asset_code])
        ->assertJsonStructure(['data' => ['generated_at', 'sections' => [
            'repair_required', 'unknown_location', 'missing_identity_or_documents',
            'maintenance_by_hours', 'recent_transfers', 'incomplete_records',
        ]]]);
});
