<?php

use App\Enums\EquipmentChangeSource;
use App\Enums\EquipmentChangeType;
use App\Enums\UserRole;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\EquipmentProjectAssignment;
use App\Models\Location;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

uses(LazilyRefreshDatabase::class);

it('transfers a generator to another active site and records its history', function () {
    $manager = User::factory()->create(['role' => UserRole::GeneratorManager]);
    $category = EquipmentCategory::factory()->create(['code' => 'generator']);
    $source = Project::factory()->create(['name' => 'BASSAM']);
    $destination = Project::factory()->create(['name' => 'ABIDJAN']);
    $destinationLocation = Location::factory()->for($destination)->create(['name' => 'BASE']);
    $generator = Equipment::factory()->for($category, 'category')->create();
    $assignment = EquipmentProjectAssignment::factory()->for($generator)->for($source)->create(['ended_at' => null]);

    $this->actingAs($manager, 'web')->postJson("/api/v1/equipment/{$generator->id}/transfer", [
        'from_project_id' => $source->id,
        'to_project_id' => $destination->id,
        'to_location_id' => $destinationLocation->id,
    ])->assertOk()
        ->assertJsonPath('data.current_project_assignment.project.id', $destination->id)
        ->assertJsonPath('data.current_location.id', $destinationLocation->id);

    expect($assignment->fresh()->ended_at)->not->toBeNull();
    $this->assertDatabaseHas('equipment_project_assignments', [
        'equipment_id' => $generator->id,
        'project_id' => $destination->id,
        'assigned_by_user_id' => $manager->id,
        'ended_at' => null,
    ]);
    $this->assertDatabaseHas('equipment_changes', [
        'equipment_id' => $generator->id,
        'actor_user_id' => $manager->id,
        'change_type' => EquipmentChangeType::ProjectAssignmentChanged->value,
        'source' => EquipmentChangeSource::Transfer->value,
    ]);
});

it('requires a destination physical location and rejects a location from another site', function () {
    $manager = User::factory()->create(['role' => UserRole::GeneratorManager]);
    $category = EquipmentCategory::factory()->create(['code' => 'generator']);
    $source = Project::factory()->create();
    $destination = Project::factory()->create();
    $wrongLocation = Location::factory()->for($source)->create();
    $generator = Equipment::factory()->for($category, 'category')->create();
    EquipmentProjectAssignment::factory()->for($generator)->for($source)->create(['ended_at' => null]);

    $this->actingAs($manager, 'web')->postJson("/api/v1/equipment/{$generator->id}/transfer", [
        'from_project_id' => $source->id,
        'to_project_id' => $destination->id,
        'to_location_id' => null,
    ])->assertUnprocessable()->assertJsonValidationErrors(['to_location_id']);

    $this->actingAs($manager, 'web')->postJson("/api/v1/equipment/{$generator->id}/transfer", [
        'from_project_id' => $source->id,
        'to_project_id' => $destination->id,
        'to_location_id' => $wrongLocation->id,
    ])->assertUnprocessable()->assertJsonValidationErrors(['to_location_id']);
});

it('forbids viewers from transferring generators', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $generator = Equipment::factory()->create();
    $destination = Project::factory()->create();

    $this->actingAs($viewer, 'web')->postJson("/api/v1/equipment/{$generator->id}/transfer", [
        'from_project_id' => null,
        'to_project_id' => $destination->id,
        'to_location_id' => null,
    ])->assertForbidden();
});

it('rejects transferring a non-generator asset', function () {
    $manager = User::factory()->create(['role' => UserRole::GeneratorManager]);
    $category = EquipmentCategory::factory()->create(['code' => 'car']);
    $asset = Equipment::factory()->for($category, 'category')->create();
    $destination = Project::factory()->create();
    $destinationLocation = Location::factory()->for($destination)->create();

    $this->actingAs($manager, 'web')->postJson("/api/v1/equipment/{$asset->id}/transfer", [
        'from_project_id' => null,
        'to_project_id' => $destination->id,
        'to_location_id' => $destinationLocation->id,
    ])->assertUnprocessable()->assertJsonValidationErrors(['equipment']);
});
