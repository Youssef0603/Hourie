<?php

use App\Enums\UserRole;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\Location;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

uses(LazilyRefreshDatabase::class);

function carPayload(): array
{
    return [
        'category_code' => 'car',
        'brand' => 'Toyota',
        'model' => 'Hilux',
        'serial_number' => 'JTEBX3FJ50K123456',
        'registration_number' => 'AA-406-CG',
        'manufacture_year' => 2022,
        'condition' => null,
        'usage_status' => 'in_use',
        'custodian_employee_id' => null,
        'observations' => null,
        'asset_details' => [
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
        ->assertJsonPath('data.serial_number', 'JTEBX3FJ50K123456')
        ->assertJsonPath('data.registration_number', 'AA-406-CG')
        ->assertJsonMissingPath('data.asset_details.chassis_number')
        ->assertJsonPath('data.asset_details.inspection_date', '2026-10-15')
        ->assertJsonPath('data.asset_details.fuel_type', 'Diesel')
        ->assertJsonPath('data.usage_status', 'in_use')
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
    $payload['usage_status'] = 'not_in_use';

    $this->actingAs($manager, 'web')->patchJson("/api/v1/equipment/{$id}", $payload)
        ->assertOk()
        ->assertJsonPath('data.asset_details.odometer_km', 45000)
        ->assertJsonPath('data.usage_status', 'not_in_use');

    expect(Equipment::query()->findOrFail($id)->generatorDetails)->toBeNull();
});

it('updates a truck location while preserving manufacturer plate details', function () {
    $manager = User::factory()->create(['role' => UserRole::GeneratorManager]);
    $project = Project::factory()->create();
    $location = Location::factory()->for($project)->create();
    $payload = [
        'category_code' => 'truck_dumper',
        'brand' => 'SINOTRUK HOWO 6*4',
        'model' => 'ZZ4257N3247B1',
        'serial_number' => 'LZZ1CLNB6SN096200',
        'manufacture_year' => 2025,
        'condition' => null,
        'custodian_employee_id' => null,
        'observations' => null,
        'asset_details' => [
            'vehicle_type' => 'ROAD TRACTOR',
            'manufacturer' => 'China National Heavy Duty Truck Group Co., Ltd',
            'manufacture_date' => '2025-06',
            'engine_output_hp' => 371,
            'permissible_combination_weight_kg' => 55000,
            'axle_1_weight_kg' => 7100,
            'axle_2_weight_kg' => 16000,
            'axle_3_weight_kg' => 16000,
            'identification_source' => 'Plaque constructeur',
        ],
    ];
    $id = $this->actingAs($manager, 'web')->postJson('/api/v1/equipment', $payload)
        ->assertCreated()
        ->json('data.id');

    unset($payload['category_code']);
    $payload['project_id'] = $project->id;
    $payload['current_location_id'] = $location->id;

    $this->actingAs($manager, 'web')->patchJson("/api/v1/equipment/{$id}", $payload)
        ->assertOk()
        ->assertJsonPath('data.current_location.id', $location->id)
        ->assertJsonPath('data.current_project_assignment.project.id', $project->id)
        ->assertJsonPath('data.asset_details.engine_output_hp', 371)
        ->assertJsonPath('data.asset_details.permissible_combination_weight_kg', 55000);
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
        if ($code !== 'car') {
            unset($payload['registration_number']);
        }

        $this->actingAs($manager, 'web')->postJson('/api/v1/equipment', $payload)
            ->assertCreated()
            ->assertJsonPath('data.category.code', $code);

        $this->actingAs($manager, 'web')->getJson('/api/v1/equipment?category='.$code)
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    $this->actingAs($manager, 'web')->getJson('/api/v1/equipment')
        ->assertOk()
        ->assertJsonCount(count(EquipmentCategory::ASSET_CATEGORIES) - 1, 'data');
});

it('supports add, details, edit, filtering, and the correct id prefix for every specialized material category', function () {
    $manager = User::factory()->create(['role' => UserRole::GeneratorManager]);

    foreach (EquipmentCategory::GENERAL_EQUIPMENT_CATEGORY_CODES as $code) {
        if ($code === 'equipment') {
            continue;
        }

        $definition = EquipmentCategory::ASSET_CATEGORIES[$code];
        $payload = carPayload();
        $payload['category_code'] = $code;
        unset($payload['registration_number']);
        $payload['asset_details'] = array_fill_keys(array_keys($definition['fields']), null);
        $payload['asset_details']['equipment_type'] = 'Type initial '.$code;
        $payload['asset_details']['sub_category'] = 'Sous-catégorie initiale';

        $created = $this->actingAs($manager, 'web')->postJson('/api/v1/equipment', $payload)
            ->assertCreated()
            ->assertJsonPath('data.category.code', $code)
            ->assertJsonPath('data.asset_details.equipment_type', 'Type initial '.$code);

        $id = $created->json('data.id');
        expect($created->json('data.asset_code'))->toBe(EquipmentCategory::assetCode($code, $id));

        $this->actingAs($manager, 'web')->getJson("/api/v1/equipment/{$id}")
            ->assertOk()
            ->assertJsonPath('data.category.code', $code)
            ->assertJsonPath('data.asset_details.sub_category', 'Sous-catégorie initiale');

        unset($payload['category_code']);
        $payload['asset_details']['equipment_type'] = 'Type modifié '.$code;
        $this->actingAs($manager, 'web')->patchJson("/api/v1/equipment/{$id}", $payload)
            ->assertOk()
            ->assertJsonPath('data.asset_details.equipment_type', 'Type modifié '.$code);

        $this->actingAs($manager, 'web')->getJson('/api/v1/equipment?category='.$code.'&equipment_type='.urlencode('Type modifié '.$code))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $id);
    }
});
