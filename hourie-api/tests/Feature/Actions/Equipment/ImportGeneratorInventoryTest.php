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

it('imports generator rows with standardized codes, nulls, provenance, and separate assignments', function () {
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
        'imported_rows' => 2,
        'warning_rows' => 0,
    ]);
    expect(Equipment::query()->count())->toBe(2);
    expect(EquipmentCategory::query()->where('code', 'generator')->exists())->toBeTrue();
    expect(EquipmentImportRow::query()->count())->toBe(2);
    expect(EquipmentChange::query()->where('change_type', EquipmentChangeType::InitialImport)->count())->toBe(2);

    $bassamGenerator = EquipmentImportRow::query()->where('source_asset_code', 'A.H-001')->firstOrFail()->equipment;
    $vridiGenerator = EquipmentImportRow::query()->where('source_asset_code', 'A.H-0010')->firstOrFail()->equipment;

    expect($bassamGenerator->manufacture_year)->toBe(2023);
    expect($bassamGenerator->asset_code)->toBe('A.H-GEN-'.str_pad((string) $bassamGenerator->id, 3, '0', STR_PAD_LEFT));
    expect($bassamGenerator->condition)->toBe(EquipmentCondition::Good->value);
    expect($bassamGenerator->currentLocation->name)->toBe('BASE');
    expect($bassamGenerator->currentLocation->parent->name)->toBe('BASSAM');
    expect($bassamGenerator->currentLocation->project->name)->toBe('BASSAM');
    expect($bassamGenerator->projectAssignments()->firstOrFail()->project->name)->toBe('BASSAM');

    expect($vridiGenerator->asset_code)->toBe('A.H-GEN-'.str_pad((string) $vridiGenerator->id, 3, '0', STR_PAD_LEFT));
    expect($vridiGenerator->model)->toBeNull();
    expect($vridiGenerator->manufacture_year)->toBeNull();
    expect($vridiGenerator->condition)->toBe(EquipmentCondition::Defective->value);
    expect($vridiGenerator->operational_situation)->toBeNull();
    expect($vridiGenerator->generatorDetails->voltage_rating)->toBe('220/380');
    expect($vridiGenerator->generatorDetails->current_rating)->toBe('23/40');

    expect(EquipmentImportRow::query()->where('source_asset_code', 'A.H-0011')->exists())->toBeFalse();

    expect(Project::query()->count())->toBe(2);
    expect(Location::query()->whereNotNull('project_id')->count())->toBe(4);
    expect(EquipmentProjectAssignment::query()->count())->toBe(2);
    expect(EquipmentImport::query()->count())->toBe(1);
});

it('rejects duplicate asset codes before writing any import data', function () {
    EquipmentCategory::factory()->create(['code' => 'generator']);
    $rows = [
        4 => ['A' => '1', 'B' => 'A.H-001', 'C' => 'BASSAM'],
        5 => ['A' => '2', 'B' => 'A.H-001', 'C' => 'BASSAM'],
    ];

    expect(fn () => app(ImportGeneratorInventory::class)->handle(
        'Groupes.xlsx',
        str_repeat('b', 64),
        $rows,
    ))->toThrow(ValidationException::class, 'Le code équipement A.H-001 apparaît plusieurs fois dans le fichier.');

    expect(Equipment::query()->count())->toBe(0);
    expect(EquipmentImport::query()->count())->toBe(0);
});

it('imports garage base into the garage company location instead of a site', function () {
    $rows = [
        4 => [
            'A' => '1',
            'B' => 'A.H-020',
            'C' => 'GARAGE BASE',
            'E' => 'KOHLER',
            'F' => '40 KVA',
        ],
    ];

    app(ImportGeneratorInventory::class)->handle('Groupes.xlsx', str_repeat('c', 64), $rows);

    $generator = Equipment::query()->firstOrFail();
    expect($generator->currentProjectAssignment)->toBeNull();
    expect($generator->currentLocation?->name)->toBe('GARAGE');
    expect($generator->currentLocation?->location_type)->toBe('company_location');
    expect(Project::query()->where('name', 'GARAGE BASE')->exists())->toBeFalse();
});
