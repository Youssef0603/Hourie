<?php

use App\Enums\UserRole;
use App\Models\Equipment;
use App\Models\EquipmentMaintenance;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

uses(LazilyRefreshDatabase::class);

it('requires authentication to view maintenance warnings', function () {
    $this->getJson('/api/v1/maintenance-warnings')->assertUnauthorized();
});

it('lists overdue and upcoming maintenance from each active generators latest intervention', function () {
    $this->travelTo('2026-09-21 08:00:00');
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $overdueEquipment = Equipment::factory()->create();
    $dueTodayEquipment = Equipment::factory()->create();
    $upcomingEquipment = Equipment::factory()->create();
    $outsideWindowEquipment = Equipment::factory()->create();
    $supersededScheduleEquipment = Equipment::factory()->create();
    $inactiveEquipment = Equipment::factory()->create(['is_active' => false]);

    EquipmentMaintenance::factory()->for($overdueEquipment)->create([
        'maintenance_date' => '2026-06-01',
        'next_maintenance_date' => '2026-09-10',
    ]);
    EquipmentMaintenance::factory()->for($dueTodayEquipment)->create([
        'maintenance_date' => '2026-06-02',
        'next_maintenance_date' => '2026-09-21',
    ]);
    EquipmentMaintenance::factory()->for($upcomingEquipment)->create([
        'maintenance_date' => '2026-06-03',
        'next_maintenance_date' => '2026-10-05',
    ]);
    EquipmentMaintenance::factory()->for($outsideWindowEquipment)->create([
        'maintenance_date' => '2026-06-04',
        'next_maintenance_date' => '2026-10-22',
    ]);
    EquipmentMaintenance::factory()->for($supersededScheduleEquipment)->create([
        'maintenance_date' => '2026-05-01',
        'next_maintenance_date' => '2026-09-01',
    ]);
    EquipmentMaintenance::factory()->for($supersededScheduleEquipment)->create([
        'maintenance_date' => '2026-09-15',
        'next_maintenance_date' => null,
    ]);
    EquipmentMaintenance::factory()->for($inactiveEquipment)->create([
        'maintenance_date' => '2026-06-05',
        'next_maintenance_date' => '2026-09-05',
    ]);

    $response = $this
        ->actingAs($viewer, 'web')
        ->getJson('/api/v1/maintenance-warnings');

    $response
        ->assertOk()
        ->assertJsonPath('summary.overdue', 1)
        ->assertJsonPath('summary.due_soon', 2)
        ->assertJsonPath('summary.total', 3)
        ->assertJsonPath('summary.horizon_days', 14)
        ->assertJsonPath('data.0.equipment.id', $overdueEquipment->id)
        ->assertJsonPath('data.0.status', 'overdue')
        ->assertJsonPath('data.0.days_until_due', -11)
        ->assertJsonPath('data.1.equipment.id', $dueTodayEquipment->id)
        ->assertJsonPath('data.1.status', 'due_soon')
        ->assertJsonPath('data.1.days_until_due', 0)
        ->assertJsonPath('data.2.equipment.id', $upcomingEquipment->id)
        ->assertJsonPath('data.2.next_maintenance_date', '2026-10-05')
        ->assertJsonCount(3, 'data');
});
