<?php

use App\Enums\UserRole;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\Location;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

uses(LazilyRefreshDatabase::class);

function carPayload(): array
{
    return [
        'category_code' => 'car',
        'brand' => 'Toyota',
        'model' => 'Hilux',
        'serial_number' => '1234 AB 01',
        'manufacture_year' => 2022,
        'condition' => null,
        'operational_situation' => null,
        'custodian_employee_id' => null,
        'observations' => null,
        'asset_details' => [
            'chassis_number' => 'JTEBX3FJ50K123456',
            'inspection_date' => '2026-10-15',
            'fuel_type' => 'Diesel',
            'odometer_km' => 42000,
        ],
    ];
}

it('creates and lists a car without generator details', function () {
    $manager = User::factory()->create(['role' => UserRole::GeneratorManager]);

    $response = $this->actingAs($manager, 'web')
        ->postJson('/api/v1/equipment', carPayload())
        ->assertCreated()
        ->assertJsonPath('data.category.code', 'car')
        ->assertJsonPath('data.serial_number', '1234 AB 01')
        ->assertJsonPath('data.asset_details.chassis_number', 'JTEBX3FJ50K123456')
        ->assertJsonPath('data.asset_details.inspection_date', '2026-10-15')
        ->assertJsonPath('data.asset_details.fuel_type', 'Diesel')
        ->assertJsonPath('data.generator_details', null);

    $id = $response->json('data.id');
    expect($response->json('data.asset_code'))->toBe('A.H-VOI-'.str_pad((string) $id, 3, '0', STR_PAD_LEFT));
    $this->assertDatabaseHas('equipment', ['id' => $id, 'brand' => 'Toyota']);
    $this->assertDatabaseHas('equipment_categories', ['code' => 'car']);

    $this->actingAs($manager, 'web')->getJson('/api/v1/equipment?category=car&asset_field=fuel_type&asset_value=Diesel')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $id);

    $this->actingAs($manager, 'web')->getJson('/api/v1/equipment?category=car&asset_field=fuel_type&asset_value=diesel')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $id);

    $this->actingAs($manager, 'web')->getJson('/api/v1/equipment?category=generator')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('allows a car to be assigned to an enterprise location without a site', function () {
    $manager = User::factory()->create(['role' => UserRole::GeneratorManager]);
    $office = Location::query()->where('name', 'BUREAU')->where('location_type', 'company_location')->firstOrFail();
    $payload = carPayload();
    $payload['current_location_id'] = $office->id;

    $this->actingAs($manager, 'web')
        ->postJson('/api/v1/equipment', $payload)
        ->assertCreated()
        ->assertJsonPath('data.current_location.name', 'BUREAU')
        ->assertJsonPath('data.current_project_assignment', null);
});

it('updates only the fields supported by the asset category', function () {
    $manager = User::factory()->create(['role' => UserRole::GeneratorManager]);
    $id = $this->actingAs($manager, 'web')->postJson('/api/v1/equipment', carPayload())->json('data.id');
    $payload = carPayload();
    unset($payload['category_code']);
    $payload['asset_details']['odometer_km'] = 45000;

    $this->actingAs($manager, 'web')->patchJson("/api/v1/equipment/{$id}", $payload)
        ->assertOk()
        ->assertJsonPath('data.asset_details.odometer_km', 45000);

    expect(Equipment::query()->findOrFail($id)->generatorDetails)->toBeNull();
});

it('rejects generator-only fields on a car', function () {
    $manager = User::factory()->create(['role' => UserRole::GeneratorManager]);
    $payload = carPayload();
    $payload['generator_details'] = ['apparent_power_kva' => 100];

    $this->actingAs($manager, 'web')->postJson('/api/v1/equipment', $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['generator_details']);
    $this->assertDatabaseCount('equipment', 0);
});

it('supports every non-generator category and the all-assets inventory', function () {
    $manager = User::factory()->create(['role' => UserRole::GeneratorManager]);

    foreach (EquipmentCategory::ASSET_CATEGORIES as $code => $definition) {
        if ($code === 'generator') {
            continue;
        }

        $payload = carPayload();
        $payload['category_code'] = $code;
        $payload['asset_details'] = array_fill_keys(array_keys($definition['fields']), null);

        $this->actingAs($manager, 'web')->postJson('/api/v1/equipment', $payload)
            ->assertCreated()
            ->assertJsonPath('data.category.code', $code);

        $this->actingAs($manager, 'web')->getJson('/api/v1/equipment?category='.$code)
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    $this->actingAs($manager, 'web')->getJson('/api/v1/equipment')
        ->assertOk()
        ->assertJsonCount(7, 'data');
});
