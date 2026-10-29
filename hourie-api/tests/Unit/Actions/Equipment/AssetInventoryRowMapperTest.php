<?php

use App\Actions\Equipment\AssetInventoryRowMapper;

it('maps general equipment types into their specialized categories', function (string $type, ?string $subCategory, string $expectedCategory): void {
    $mapped = app(AssetInventoryRowMapper::class)->map([
        'E' => $type,
        'C' => $subCategory,
    ]);

    expect($mapped['category_code'])->toBe($expectedCategory);
})->with([
    ['Excavator', null, 'earthmoving'],
    ['Vibrating Roller', null, 'compaction'],
    ['Asphalt Paver', null, 'road_equipment'],
    ['Concrete Pump', null, 'concrete_equipment'],
    ['Batching Plant', 'Asphalt & Paving', 'road_equipment'],
    ['Batching Plant', 'Concrete', 'concrete_equipment'],
    ['Motor pump', null, 'pumps_dewatering'],
    ['Bar Bending Machine', null, 'workshop_rebar'],
    ['Portable light tower', null, 'site_equipment'],
    ['Unknown item', null, 'equipment'],
]);
