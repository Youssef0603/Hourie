<?php

use App\Enums\EquipmentChangeSource;
use App\Enums\EquipmentChangeType;
use App\Enums\EquipmentCondition;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\EquipmentChange;
use App\Models\EquipmentProjectAssignment;
use App\Models\GeneratorDetail;
use App\Models\Location;
use App\Models\Project;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

uses(LazilyRefreshDatabase::class);

it('keeps current physical location separate from project assignment', function () {
    $physicalProject = Project::factory()->create(['name' => 'BASSAM']);
    $assignedProject = Project::factory()->create(['name' => 'VRIDI']);
    $physicalLocation = Location::factory()->for($physicalProject)->create(['name' => 'BASE']);
    $category = EquipmentCategory::factory()->create(['code' => 'generator']);
    $equipment = Equipment::factory()
        ->for($category, 'category')
        ->for($physicalLocation, 'currentLocation')
        ->create([
            'asset_code' => 'A.H-0010',
            'manufacture_year' => 2023,
            'condition' => EquipmentCondition::Functional,
            'operational_situation' => null,
        ]);
    EquipmentProjectAssignment::factory()
        ->for($equipment)
        ->for($assignedProject)
        ->create();

    expect($equipment->fresh()->currentLocation->project->is($physicalProject))->toBeTrue();
    expect($equipment->projectAssignments()->firstOrFail()->project->is($assignedProject))->toBeTrue();
    expect($equipment->asset_code)->toBe('A.H-0010');
    expect($equipment->manufacture_year)->toBe(2023);
    expect($equipment->operational_situation)->toBeNull();
});

it('stores generator specifications outside the shared equipment record', function () {
    $equipment = Equipment::factory()->create();
    GeneratorDetail::factory()->for($equipment)->create([
        'voltage_rating' => '220/380',
        'current_rating' => '23/40',
    ]);

    $details = $equipment->fresh()->generatorDetails;

    expect($details->voltage_rating)->toBe('220/380');
    expect($details->current_rating)->toBe('23/40');
});

it('records an equipment change without becoming the current source of truth', function () {
    $equipment = Equipment::factory()->create([
        'condition' => EquipmentCondition::Functional,
    ]);
    EquipmentChange::factory()->for($equipment)->create([
        'change_type' => EquipmentChangeType::ConditionChanged,
        'source' => EquipmentChangeSource::Manual,
        'previous_values' => ['condition' => 'defective'],
        'new_values' => ['condition' => 'functional'],
    ]);

    $change = $equipment->changes()->firstOrFail();

    expect($equipment->fresh()->condition)->toBe(EquipmentCondition::Functional->value);
    expect($change->previous_values)->toBe(['condition' => 'defective']);
    expect($change->new_values)->toBe(['condition' => 'functional']);
});
