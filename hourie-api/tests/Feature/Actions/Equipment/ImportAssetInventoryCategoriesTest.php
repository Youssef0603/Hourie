<?php

use App\Actions\Equipment\ImportAssetInventory;
use App\Models\Equipment;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

uses(LazilyRefreshDatabase::class);

it('imports every specialized material type into its category with the correct asset prefix', function (): void {
    $definitions = [
        ['Excavator', 'Earth Moving', 'earthmoving', 'TER'],
        ['Vibrating Roller', 'Compaction', 'compaction', 'COM'],
        ['Asphalt Paver', 'Asphalt & Paving', 'road_equipment', 'ROU'],
        ['Concrete Pump', 'Concrete', 'concrete_equipment', 'BET'],
        ['Motor pump', 'Pump', 'pumps_dewatering', 'POM'],
        ['Bar Bending Machine', 'Steel Equipment', 'workshop_rebar', 'ATE'],
        ['Portable light tower', 'Site Equipment', 'site_equipment', 'ECH'],
    ];
    $rows = [];

    foreach ($definitions as $offset => [$type, $subCategory]) {
        $rows[$offset + 6] = [
            'C' => $subCategory,
            'E' => $type,
            'F' => 'Test brand',
            'H' => 'Test model',
            'J' => 'IMPORT-SERIAL-'.($offset + 1),
        ];
    }

    $import = app(ImportAssetInventory::class)->handle('inventory.xlsx', hash('sha256', 'specialized-categories'), $rows);

    expect($import->summary['imported_rows'])->toBe(count($definitions));

    foreach ($definitions as $offset => [, , $categoryCode, $prefix]) {
        $equipment = Equipment::query()
            ->where('serial_number', 'IMPORT-SERIAL-'.($offset + 1))
            ->with('category')
            ->firstOrFail();

        expect($equipment->category->code)->toBe($categoryCode)
            ->and($equipment->asset_code)->toBe('A.H-'.$prefix.'-'.str_pad((string) $equipment->id, 3, '0', STR_PAD_LEFT));
    }
});
