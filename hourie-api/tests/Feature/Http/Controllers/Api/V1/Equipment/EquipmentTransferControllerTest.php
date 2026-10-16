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
        ->assertJsonPath('data.current_location.id', $destinationLocation->id)
        ->assertJsonPath('data.changes.0.transfer.from.project', $source->name)
        ->assertJsonPath('data.changes.0.transfer.to.project', $destination->name)
        ->assertJsonPath('data.changes.0.transfer.to.location', $destinationLocation->name);

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

it('transfers non-generator equipment too', function () {
    $manager = User::factory()->create(['role' => UserRole::GeneratorManager]);
    $category = EquipmentCategory::factory()->create(['code' => 'car']);
    $asset = Equipment::factory()->for($category, 'category')->create();
    $destination = Project::factory()->create();
    $destinationLocation = Location::factory()->for($destination)->create();

    $this->actingAs($manager, 'web')->postJson("/api/v1/equipment/{$asset->id}/transfer", [
        'from_project_id' => null,
        'to_project_id' => $destination->id,
        'to_location_id' => $destinationLocation->id,
    ])->assertOk()
        ->assertJsonPath('data.current_project_assignment.project.id', $destination->id)
        ->assertJsonPath('data.current_location.id', $destinationLocation->id);
});

it('removes the latest transfer and restores its source site and location', function () {
    $manager = User::factory()->create(['role' => UserRole::GeneratorManager]);
    $category = EquipmentCategory::factory()->create(['code' => 'equipment']);
    $source = Project::factory()->create(['name' => 'BASSAM']);
    $sourceLocation = Location::factory()->for($source)->create(['name' => 'LOT 1']);
    $destination = Project::factory()->create(['name' => 'ABIDJAN']);
    $destinationLocation = Location::factory()->for($destination)->create(['name' => 'BASE']);
    $equipment = Equipment::factory()->for($category, 'category')->create([
        'current_location_id' => $sourceLocation->id,
    ]);
    $sourceAssignment = EquipmentProjectAssignment::factory()->for($equipment)->for($source)->create(['ended_at' => null]);

    $response = $this->actingAs($manager, 'web')->postJson("/api/v1/equipment/{$equipment->id}/transfer", [
        'from_project_id' => $source->id,
        'to_project_id' => $destination->id,
        'to_location_id' => $destinationLocation->id,
    ])->assertOk();
    $changeId = $response->json('data.changes.0.id');
    $destinationAssignmentId = $response->json('data.current_project_assignment.id');

    $this->deleteJson("/api/v1/equipment/{$equipment->id}/transfers/{$changeId}")
        ->assertOk()
        ->assertJsonPath('data.current_project_assignment.project.id', $source->id)
        ->assertJsonPath('data.current_location.id', $sourceLocation->id);

    expect($sourceAssignment->fresh()->ended_at)->toBeNull();
    $this->assertDatabaseMissing('equipment_project_assignments', ['id' => $destinationAssignmentId]);
    $this->assertDatabaseMissing('equipment_changes', ['id' => $changeId]);
    $this->assertDatabaseHas('equipment_changes', [
        'equipment_id' => $equipment->id,
        'actor_user_id' => $manager->id,
        'source' => EquipmentChangeSource::Manual->value,
        'reason' => 'Transfer removed',
    ]);
});

it('only permits removing the latest transfer', function () {
    $manager = User::factory()->create(['role' => UserRole::GeneratorManager]);
    $category = EquipmentCategory::factory()->create(['code' => 'generator']);
    $source = Project::factory()->create();
    $middle = Project::factory()->create();
    $destination = Project::factory()->create();
    $middleLocation = Location::factory()->for($middle)->create();
    $destinationLocation = Location::factory()->for($destination)->create();
    $equipment = Equipment::factory()->for($category, 'category')->create();
    EquipmentProjectAssignment::factory()->for($equipment)->for($source)->create(['ended_at' => null]);

    $firstTransferId = $this->actingAs($manager, 'web')->postJson("/api/v1/equipment/{$equipment->id}/transfer", [
        'from_project_id' => $source->id,
        'to_project_id' => $middle->id,
        'to_location_id' => $middleLocation->id,
    ])->assertOk()->json('data.changes.0.id');

    $this->postJson("/api/v1/equipment/{$equipment->id}/transfer", [
        'from_project_id' => $middle->id,
        'to_project_id' => $destination->id,
        'to_location_id' => $destinationLocation->id,
    ])->assertOk();

    $this->deleteJson("/api/v1/equipment/{$equipment->id}/transfers/{$firstTransferId}")
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['transfer']);

    expect($equipment->fresh()->currentProjectAssignment?->project_id)->toBe($destination->id);
});

it('removes a legacy transfer that predates assignment identifiers', function () {
    $manager = User::factory()->create(['role' => UserRole::GeneratorManager]);
    $category = EquipmentCategory::factory()->create(['code' => 'generator']);
    $source = Project::factory()->create(['name' => 'VRIDI']);
    $sourceLocation = Location::factory()->for($source)->create(['name' => 'DÉPÔT']);
    $destination = Project::factory()->create(['name' => 'BASSAM']);
    $destinationLocation = Location::factory()->for($destination)->create(['name' => 'LOT 2']);
    $equipment = Equipment::factory()->for($category, 'category')->create([
        'current_location_id' => $destinationLocation->id,
    ]);
    $sourceAssignment = EquipmentProjectAssignment::factory()->for($equipment)->for($source)->create([
        'ended_at' => now()->subDay(),
    ]);
    $destinationAssignment = EquipmentProjectAssignment::factory()->for($equipment)->for($destination)->create([
        'ended_at' => null,
    ]);
    $legacyChange = $equipment->changes()->create([
        'actor_user_id' => $manager->id,
        'change_type' => EquipmentChangeType::ProjectAssignmentChanged,
        'source' => EquipmentChangeSource::Transfer,
        'previous_values' => [
            'project_id' => $source->id,
            'location_id' => $sourceLocation->id,
            'project_name' => $source->name,
            'location_name' => $sourceLocation->name,
        ],
        'new_values' => [
            'project_id' => $destination->id,
            'location_id' => $destinationLocation->id,
            'project_name' => $destination->name,
            'location_name' => $destinationLocation->name,
        ],
        'occurred_at' => now(),
    ]);

    $this->actingAs($manager, 'web')
        ->deleteJson("/api/v1/equipment/{$equipment->id}/transfers/{$legacyChange->id}")
        ->assertOk()
        ->assertJsonPath('data.current_project_assignment.project.id', $source->id)
        ->assertJsonPath('data.current_location.id', $sourceLocation->id);

    expect($sourceAssignment->fresh()->ended_at)->toBeNull();
    $this->assertDatabaseMissing('equipment_project_assignments', ['id' => $destinationAssignment->id]);
    $this->assertDatabaseMissing('equipment_changes', ['id' => $legacyChange->id]);
});

it('forbids viewers from removing transfers', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $category = EquipmentCategory::factory()->create(['code' => 'generator']);
    $source = Project::factory()->create();
    $destination = Project::factory()->create();
    $destinationLocation = Location::factory()->for($destination)->create();
    $equipment = Equipment::factory()->for($category, 'category')->create([
        'current_location_id' => $destinationLocation->id,
    ]);
    EquipmentProjectAssignment::factory()->for($equipment)->for($source)->create(['ended_at' => now()->subDay()]);
    $destinationAssignment = EquipmentProjectAssignment::factory()->for($equipment)->for($destination)->create(['ended_at' => null]);
    $change = $equipment->changes()->create([
        'change_type' => EquipmentChangeType::ProjectAssignmentChanged,
        'source' => EquipmentChangeSource::Transfer,
        'previous_values' => ['project_id' => $source->id],
        'new_values' => [
            'project_assignment_id' => $destinationAssignment->id,
            'project_id' => $destination->id,
            'location_id' => $destinationLocation->id,
        ],
        'occurred_at' => now(),
    ]);

    $this->actingAs($viewer, 'web')
        ->deleteJson("/api/v1/equipment/{$equipment->id}/transfers/{$change->id}")
        ->assertForbidden();
});
