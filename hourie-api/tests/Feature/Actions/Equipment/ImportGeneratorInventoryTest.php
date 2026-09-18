<?php

use App\Actions\Equipment\ImportGeneratorInventory;
use App\Enums\EquipmentChangeType;
use App\Enums\EquipmentCondition;
use App\Enums\EquipmentImportStatus;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\EquipmentChange;
use App\Models\EquipmentImport;
use App\Models\EquipmentImportRow;
use App\Models\EquipmentProjectAssignment;
use App\Models\Location;
use App\Models\Project;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Validation\ValidationException;

uses(LazilyRefreshDatabase::class);

it('imports generator rows while preserving codes, nulls, provenance, and separate assignments', function () {
    EquipmentCategory::factory()->create(['code' => 'generator']);
    $rows = [
        3 => ['A' => 'N°', 'B' => 'ID Groupe'],
        4 => [
            'A' => '1',
            'B' => 'A.H-001',
            'C' => 'BASSAM',
            'D' => 'BASE',
            'E' => 'KHOLER',
            'F' => 'B165',
            'G' => '34LNGLH0009',
            'H' => '150',
            'I' => '120',
            'J' => '3 PH',
            'K' => '400',
            'L' => '50',
            'M' => '216',
            'N' => 'GASOIL',
            'Q' => 'FONCTIONNE',
            'S' => '2023',
        ],
        5 => [
            'A' => '2',
            'B' => 'A.H-0010',
            'C' => 'VRIDI',
            'D' => 'CENTRALE',
            'F' => 'N/S',
            'K' => '220/380',
            'M' => '23/40',
            'Q' => 'DEFFECT',
            'S' => 'N/A',
        ],
        6 => ['A' => '3', 'B' => 'A.H-0011'],
    ];

    $equipmentImport = app(ImportGeneratorInventory::class)->handle(
        'Groupes.xlsx',
        str_repeat('a', 64),
        $rows,
    );

    expect($equipmentImport->status)->toBe(EquipmentImportStatus::Completed);
    expect($equipmentImport->summary)->toBe([
        'imported_rows' => 3,
        'warning_rows' => 0,
    ]);
    expect(Equipment::query()->count())->toBe(3);
    expect(EquipmentImportRow::query()->count())->toBe(3);
    expect(EquipmentChange::query()->where('change_type', EquipmentChangeType::InitialImport)->count())->toBe(3);

    $bassamGenerator = Equipment::query()->where('asset_code', 'A.H-001')->firstOrFail();
    $vridiGenerator = Equipment::query()->where('asset_code', 'A.H-0010')->firstOrFail();
    $sparseGenerator = Equipment::query()->where('asset_code', 'A.H-0011')->firstOrFail();

    expect($bassamGenerator->purchase_year)->toBe(2023);
    expect($bassamGenerator->condition)->toBe(EquipmentCondition::Functional);
    expect($bassamGenerator->currentLocation->name)->toBe('BASE');
    expect($bassamGenerator->currentLocation->parent->name)->toBe('BASSAM');
    expect($bassamGenerator->currentLocation->project->name)->toBe('BASSAM');
    expect($bassamGenerator->projectAssignments()->firstOrFail()->project->name)->toBe('BASSAM');

    expect($vridiGenerator->asset_code)->toBe('A.H-0010');
    expect($vridiGenerator->model)->toBeNull();
    expect($vridiGenerator->purchase_year)->toBeNull();
    expect($vridiGenerator->condition)->toBe(EquipmentCondition::Defective);
    expect($vridiGenerator->operational_situation)->toBeNull();
    expect($vridiGenerator->generatorDetails->voltage_rating)->toBe('220/380');
    expect($vridiGenerator->generatorDetails->current_rating)->toBe('23/40');

    expect($sparseGenerator->brand)->toBeNull();
    expect($sparseGenerator->current_location_id)->toBeNull();
    expect($sparseGenerator->projectAssignments()->exists())->toBeFalse();

    expect(Project::query()->count())->toBe(2);
    expect(Location::query()->count())->toBe(4);
    expect(EquipmentProjectAssignment::query()->count())->toBe(2);
    expect(EquipmentImport::query()->count())->toBe(1);
});

it('rejects duplicate asset codes before writing any import data', function () {
    EquipmentCategory::factory()->create(['code' => 'generator']);
    $rows = [
        4 => ['A' => '1', 'B' => 'A.H-001'],
        5 => ['A' => '2', 'B' => 'A.H-001'],
    ];

    expect(fn () => app(ImportGeneratorInventory::class)->handle(
        'Groupes.xlsx',
        str_repeat('b', 64),
        $rows,
    ))->toThrow(ValidationException::class, 'Le code équipement A.H-001 apparaît plusieurs fois dans le fichier.');

    expect(Equipment::query()->count())->toBe(0);
    expect(EquipmentImport::query()->count())->toBe(0);
});
