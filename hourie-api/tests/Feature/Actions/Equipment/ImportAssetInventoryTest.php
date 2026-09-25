<?php

use App\Actions\Equipment\ImportAssetInventory;
use App\Enums\UserRole;
use App\Models\Equipment;
use App\Models\EquipmentImportRow;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

uses(LazilyRefreshDatabase::class);

it('skips generators from the 2026 asset workbook', function () {
    $actor = User::factory()->create(['role' => UserRole::GeneratorManager]);

    $import = app(ImportAssetInventory::class)->handle('2026 equipment.xlsx', 'asset-workbook-hash', [
        6 => [
            'B' => 'Equipment',
            'D' => 'H.H',
            'E' => 'Generator',
            'F' => 'YANMAR',
            'H' => '14.5 KVA',
        ],
    ], $actor);

    expect($import->summary)->toMatchArray([
        'imported_rows' => 0,
        'skipped_rows' => 1,
        'skipped_generator_rows' => 1,
    ]);
    expect(Equipment::query()->count())->toBe(0);
    expect(EquipmentImportRow::query()->firstOrFail()->messages)->toBe(['generator_rows_must_be_imported_from_groupes']);
});

it('imports the Excel model without storing its source code', function () {
    $actor = User::factory()->create(['role' => UserRole::GeneratorManager]);

    app(ImportAssetInventory::class)->handle('2026 equipment.xlsx', 'asset-workbook-car-hash', [
        6 => [
            'B' => 'Equipment',
            'D' => 'VO.01',
            'E' => 'Car',
            'F' => 'Toyota',
            'H' => 'Hilux',
            'J' => 'VIN-123',
        ],
    ], $actor);

    $equipment = Equipment::query()->sole();

    expect($equipment->model)->toBe('Hilux');
    expect($equipment->asset_details)->not->toHaveKey('source_code');
    expect($equipment->observations)->toBeNull();
    expect(EquipmentImportRow::query()->sole()->raw_data)->not->toHaveKey('D');
});
