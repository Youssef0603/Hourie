<?php

use App\Enums\EquipmentChangeType;
use App\Enums\UserRole;
use App\Models\Employee;
use App\Models\Equipment;
use App\Models\EquipmentMaintenance;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

uses(LazilyRefreshDatabase::class);

function completeMaintenancePayload(Employee $technician): array
{
    return [
        'maintenance_date' => '2026-09-15',
        'engine_hours' => 1250.5,
        'intervention_type' => 'mechanical',
        'oil_changed' => true,
        'oil_quantity_litres' => 18.5,
        'oil_filter_changed' => true,
        'fuel_filter_changed' => true,
        'air_filter_changed' => false,
        'battery_serviced' => true,
        'coolant_serviced' => true,
        'technician_employee_id' => $technician->id,
        'technician_name' => 'Mamadou Koné',
        'next_maintenance_date' => '2027-03-15',
        'cost' => 185000,
        'cost_currency' => 'XOF',
        'observations' => 'Essai en charge concluant après intervention.',
    ];
}

it('allows a generator manager to record every maintenance field and audits it', function () {
    $user = User::factory()->create(['role' => UserRole::GeneratorManager]);
    $equipment = Equipment::factory()->create();
    $technician = Employee::factory()->create();

    $response = $this
        ->actingAs($user, 'web')
        ->postJson("/api/v1/equipment/{$equipment->id}/maintenances", completeMaintenancePayload($technician));

    $response
        ->assertCreated()
        ->assertJsonPath('data.maintenance_date', '2026-09-15')
        ->assertJsonPath('data.engine_hours', '1250.50')
        ->assertJsonPath('data.intervention_type', 'mechanical')
        ->assertJsonPath('data.oil_changed', true)
        ->assertJsonPath('data.oil_quantity_litres', '18.50')
        ->assertJsonPath('data.oil_filter_changed', true)
        ->assertJsonPath('data.fuel_filter_changed', true)
        ->assertJsonPath('data.air_filter_changed', false)
        ->assertJsonPath('data.battery_serviced', true)
        ->assertJsonPath('data.coolant_serviced', true)
        ->assertJsonPath('data.technician.id', $technician->id)
        ->assertJsonPath('data.technician_name', 'Mamadou Koné')
        ->assertJsonPath('data.next_maintenance_date', '2027-03-15')
        ->assertJsonPath('data.cost', '185000.00')
        ->assertJsonPath('data.cost_currency', 'XOF')
        ->assertJsonPath('data.observations', 'Essai en charge concluant après intervention.');

    $this->assertDatabaseHas('equipment_maintenances', [
        'equipment_id' => $equipment->id,
        'created_by_user_id' => $user->id,
        'technician_employee_id' => $technician->id,
    ]);
    $this->assertDatabaseHas('equipment_changes', [
        'equipment_id' => $equipment->id,
        'change_type' => EquipmentChangeType::MaintenanceRecorded->value,
    ]);
});

it('prevents a viewer from recording maintenance', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $equipment = Equipment::factory()->create();
    $technician = Employee::factory()->create();

    $this
        ->actingAs($viewer, 'web')
        ->postJson("/api/v1/equipment/{$equipment->id}/maintenances", completeMaintenancePayload($technician))
        ->assertForbidden();
});

it('always records maintenance costs in the company XOF currency', function () {
    $user = User::factory()->create(['role' => UserRole::GeneratorManager]);
    $equipment = Equipment::factory()->create();
    $technician = Employee::factory()->create();
    $payload = completeMaintenancePayload($technician);
    $payload['cost_currency'] = 'USD';

    $this->actingAs($user, 'web')
        ->postJson("/api/v1/equipment/{$equipment->id}/maintenances", $payload)
        ->assertCreated()
        ->assertJsonPath('data.cost_currency', 'XOF');
});

it('accepts only the four supported intervention types', function () {
    $user = User::factory()->create(['role' => UserRole::GeneratorManager]);
    $equipment = Equipment::factory()->create();
    $technician = Employee::factory()->create();
    $payload = completeMaintenancePayload($technician);
    $payload['intervention_type'] = 'preventive';

    $this->actingAs($user, 'web')
        ->postJson("/api/v1/equipment/{$equipment->id}/maintenances", $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('intervention_type');
});

it('requires the oil quantity in litres when an oil change is recorded', function () {
    $user = User::factory()->create(['role' => UserRole::GeneratorManager]);
    $equipment = Equipment::factory()->create();
    $technician = Employee::factory()->create();
    $payload = completeMaintenancePayload($technician);
    unset($payload['oil_quantity_litres']);

    $this->actingAs($user, 'web')
        ->postJson("/api/v1/equipment/{$equipment->id}/maintenances", $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('oil_quantity_litres');
});

it('prevents a generator manager from deleting a maintenance record', function () {
    $generatorManager = User::factory()->create(['role' => UserRole::GeneratorManager]);
    $equipment = Equipment::factory()->create();
    $maintenance = EquipmentMaintenance::factory()->for($equipment)->create();

    expect($generatorManager->can('delete', $maintenance))->toBeFalse();

    $this
        ->actingAs($generatorManager, 'web')
        ->deleteJson("/api/v1/equipment/{$equipment->id}/maintenances/{$maintenance->id}")
        ->assertForbidden();
});

it('allows a manager to delete a maintenance record and audits it', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $equipment = Equipment::factory()->create();
    $maintenance = EquipmentMaintenance::factory()->for($equipment)->create();

    expect($manager->can('delete', $maintenance))->toBeTrue();

    $this
        ->actingAs($manager, 'web')
        ->deleteJson("/api/v1/equipment/{$equipment->id}/maintenances/{$maintenance->id}")
        ->assertNoContent();

    $this->assertDatabaseMissing('equipment_maintenances', ['id' => $maintenance->id]);
    $this->assertDatabaseHas('equipment_changes', [
        'equipment_id' => $equipment->id,
        'change_type' => EquipmentChangeType::MaintenanceDeleted->value,
    ]);
});

it('shows complete maintenance history in equipment details', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $equipment = Equipment::factory()->create();
    $maintenance = EquipmentMaintenance::factory()->for($equipment)->create([
        'maintenance_date' => '2026-09-15',
    ]);

    $this
        ->actingAs($viewer, 'web')
        ->getJson("/api/v1/equipment/{$equipment->id}")
        ->assertOk()
        ->assertJsonPath('data.maintenances.0.id', $maintenance->id)
        ->assertJsonPath('data.maintenances.0.battery_serviced', true)
        ->assertJsonPath('data.maintenances.0.observations', 'Entretien préventif terminé.');
});
