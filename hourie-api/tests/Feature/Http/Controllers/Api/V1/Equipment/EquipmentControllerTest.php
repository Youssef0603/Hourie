<?php

use App\Enums\EquipmentCondition;
use App\Enums\OperationalSituation;
use App\Enums\UserRole;
use App\Models\Employee;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\EquipmentProjectAssignment;
use App\Models\GeneratorDetail;
use App\Models\Location;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

uses(LazilyRefreshDatabase::class);

it('returns 401 when equipment is requested without authentication', function () {
    $equipment = Equipment::factory()->create();

    $this->getJson('/api/v1/equipment')->assertUnauthorized();
    $this->getJson("/api/v1/equipment/{$equipment->id}")->assertUnauthorized();
});

it('returns a stable paginated equipment list for an authenticated user', function () {
    $user = User::factory()->create();
    $category = EquipmentCategory::factory()->create(['code' => 'generator']);
    Equipment::factory()->count(3)->for($category, 'category')->sequence(
        ['asset_code' => 'A.H-003'],
        ['asset_code' => 'A.H-001'],
        ['asset_code' => 'A.H-002'],
    )->create();

    $response = $this
        ->actingAs($user, 'web')
        ->getJson('/api/v1/equipment?per_page=2&sort=created_at_asc');

    $response
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.asset_code', 'A.H-003')
        ->assertJsonPath('data.1.asset_code', 'A.H-001')
        ->assertJsonPath('meta.total', 3)
        ->assertJsonPath('meta.per_page', 2);
});

it('sorts newest generators first and exposes a three digit display id', function () {
    $user = User::factory()->create();
    Equipment::factory()->create(['created_at' => '2026-01-01', 'asset_code' => 'OLD']);
    $newest = Equipment::factory()->create(['created_at' => '2026-02-01', 'asset_code' => 'NEW']);

    $this
        ->actingAs($user, 'web')
        ->getJson('/api/v1/equipment')
        ->assertOk()
        ->assertJsonPath('data.0.id', $newest->id)
        ->assertJsonPath('data.0.display_id', str_pad((string) $newest->id, 3, '0', STR_PAD_LEFT));
});

it('filters equipment by search, category, condition, situation, project, and location', function () {
    $user = User::factory()->create();
    $generatorCategory = EquipmentCategory::factory()->create(['code' => 'generator']);
    $vehicleCategory = EquipmentCategory::factory()->create(['code' => 'vehicle']);
    $bassam = Project::factory()->create(['name' => 'BASSAM']);
    $vridi = Project::factory()->create(['name' => 'VRIDI']);
    $base = Location::factory()->for($bassam)->create(['name' => 'BASE']);
    $matching = Equipment::factory()
        ->for($generatorCategory, 'category')
        ->for($base, 'currentLocation')
        ->create([
            'asset_code' => 'A.H-001',
            'brand' => 'KHOLER',
            'condition' => EquipmentCondition::Functional,
            'operational_situation' => OperationalSituation::InUse,
        ]);
    EquipmentProjectAssignment::factory()->for($matching)->for($vridi)->create();
    Equipment::factory()->for($vehicleCategory, 'category')->create([
        'asset_code' => 'AH-VEH-0001',
        'condition' => EquipmentCondition::Defective,
    ]);

    $query = http_build_query([
        'q' => 'KHOLER',
        'category' => 'generator',
        'condition' => 'functional',
        'operational_situation' => 'in_use',
        'project_id' => $vridi->id,
        'location_id' => $base->id,
    ]);

    $this
        ->actingAs($user, 'web')
        ->getJson('/api/v1/equipment?'.$query)
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.asset_code', 'A.H-001')
        ->assertJsonPath('data.0.current_location.project.name', 'BASSAM')
        ->assertJsonPath('data.0.current_project_assignment.project.name', 'VRIDI');
});

it('returns physical locations and Excel power values in the inventory list', function () {
    $user = User::factory()->create();
    $project = Project::factory()->create(['name' => 'BASSAM']);
    $location = Location::factory()->for($project)->create(['name' => 'BASE']);
    $equipment = Equipment::factory()->for($location, 'currentLocation')->create();
    GeneratorDetail::factory()->for($equipment)->create([
        'apparent_power_kva' => 150,
        'active_power_kw' => 120,
        'fuel_type' => 'GASOIL',
    ]);

    $this
        ->actingAs($user, 'web')
        ->getJson('/api/v1/equipment')
        ->assertOk()
        ->assertJsonPath('data.0.current_location.name', 'BASE')
        ->assertJsonPath('data.0.power.apparent_kva', '150.00')
        ->assertJsonPath('data.0.power.active_kw', '120.00')
        ->assertJsonPath('data.0.fuel_type', 'GASOIL');
});

it('inherits the site responsible unless the generator has an override', function () {
    $user = User::factory()->create();
    $siteResponsible = Employee::factory()->create(['name' => 'Responsable du site']);
    $generatorResponsible = Employee::factory()->create(['name' => 'Responsable du générateur']);
    $project = Project::factory()->create(['responsible_employee_id' => $siteResponsible->id]);
    $inherited = Equipment::factory()->create(['custodian_employee_id' => null]);
    $overridden = Equipment::factory()->create(['custodian_employee_id' => $generatorResponsible->id]);
    EquipmentProjectAssignment::factory()->for($inherited)->for($project)->create(['ended_at' => null]);
    EquipmentProjectAssignment::factory()->for($overridden)->for($project)->create(['ended_at' => null]);

    $this->actingAs($user, 'web')->getJson("/api/v1/equipment/{$inherited->id}")
        ->assertOk()
        ->assertJsonPath('data.custodian', null)
        ->assertJsonPath('data.responsible.id', $siteResponsible->id)
        ->assertJsonPath('data.responsible_source', 'site');

    $this->actingAs($user, 'web')->getJson("/api/v1/equipment/{$overridden->id}")
        ->assertOk()
        ->assertJsonPath('data.responsible.id', $generatorResponsible->id)
        ->assertJsonPath('data.responsible_source', 'generator');
});

it('filters generators by their inherited site responsible', function () {
    $user = User::factory()->create();
    $siteResponsible = Employee::factory()->create();
    $project = Project::factory()->create(['responsible_employee_id' => $siteResponsible->id]);
    $matching = Equipment::factory()->create(['custodian_employee_id' => null]);
    EquipmentProjectAssignment::factory()->for($matching)->for($project)->create(['ended_at' => null]);
    Equipment::factory()->create();

    $this->actingAs($user, 'web')
        ->getJson('/api/v1/equipment?custodian_employee_id='.$siteResponsible->id)
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $matching->id);
});

it('combines advanced technical, identity, responsibility, and date filters', function () {
    $user = User::factory()->create();
    $custodian = Employee::factory()->create();
    $matching = Equipment::factory()->for($custodian, 'custodian')->create([
        'brand' => 'KOHLER',
        'model' => 'KD110',
        'serial_number' => 'SERIAL-ADVANCED',
        'purchase_year' => 2024,
        'created_at' => '2026-06-15 10:00:00',
    ]);
    GeneratorDetail::factory()->for($matching)->create([
        'apparent_power_kva' => 150,
        'active_power_kw' => 120,
        'frequency_hz' => 50,
        'current_engine_hours' => 1250,
        'tank_capacity_litres' => 470,
        'phases' => '3 PH',
        'voltage_rating' => '400 V',
        'current_rating' => '216 A',
        'fuel_type' => 'GASOIL',
    ]);
    $other = Equipment::factory()->create(['brand' => 'OTHER', 'purchase_year' => 2010]);
    GeneratorDetail::factory()->for($other)->create(['apparent_power_kva' => 20, 'frequency_hz' => 60]);

    $query = http_build_query([
        'custodian_employee_id' => $custodian->id,
        'brand' => 'kohl',
        'model' => 'KD',
        'serial_number' => 'ADVANCED',
        'purchase_year_from' => 2020,
        'purchase_year_to' => 2025,
        'created_from' => '2026-01-01',
        'created_to' => '2026-12-31',
        'apparent_power_kva_min' => 100,
        'apparent_power_kva_max' => 200,
        'active_power_kw_min' => 100,
        'active_power_kw_max' => 130,
        'frequency_hz_min' => 49,
        'frequency_hz_max' => 51,
        'engine_hours_min' => 1000,
        'engine_hours_max' => 1500,
        'tank_capacity_litres_min' => 400,
        'tank_capacity_litres_max' => 500,
        'phases' => '3 PH',
        'voltage_rating' => '400',
        'current_rating' => '216',
        'fuel_type' => 'gasoil',
    ]);

    $this->actingAs($user, 'web')
        ->getJson('/api/v1/equipment?'.$query)
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $matching->id);
});

it('returns 422 for an invalid equipment filter', function () {
    $user = User::factory()->create();

    $this
        ->actingAs($user, 'web')
        ->getJson('/api/v1/equipment?condition=available')
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['condition']);
});

it('returns authenticated filter options with distinct projects and physical locations', function () {
    $user = User::factory()->create();
    $category = EquipmentCategory::factory()->create([
        'code' => 'generator',
        'name' => 'Générateurs',
    ]);
    $project = Project::factory()->create(['name' => 'BASSAM']);
    $location = Location::factory()->for($project)->create(['name' => 'BASE']);
    GeneratorDetail::factory()->create(['fuel_type' => 'GASOIL']);

    $this->getJson('/api/v1/equipment-filter-options')->assertUnauthorized();

    $this
        ->actingAs($user, 'web')
        ->getJson('/api/v1/equipment-filter-options')
        ->assertOk()
        ->assertJsonPath('data.categories.0.id', $category->id)
        ->assertJsonPath('data.projects.0.id', $project->id)
        ->assertJsonPath('data.locations.0.id', $location->id)
        ->assertJsonPath('data.locations.0.project.name', 'BASSAM')
        ->assertJsonPath('data.fuel_types.0', 'GASOIL')
        ->assertJsonPath('data.catalogs.0.is_active', true);
});

it('allows managers to remove equipment from the active inventory', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $equipment = Equipment::factory()->create();

    $this->actingAs($manager, 'web')
        ->deleteJson("/api/v1/equipment/{$equipment->id}")
        ->assertNoContent();

    expect($equipment->fresh()->is_active)->toBeFalse();
    $this->assertDatabaseHas('equipment_changes', [
        'equipment_id' => $equipment->id,
        'actor_user_id' => $manager->id,
        'change_type' => 'archived',
    ]);

    $this->actingAs($manager, 'web')
        ->getJson('/api/v1/equipment')
        ->assertOk()
        ->assertJsonMissing(['id' => $equipment->id]);
});

it('returns 403 when a viewer tries to remove equipment', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $equipment = Equipment::factory()->create();

    $this->actingAs($viewer, 'web')
        ->deleteJson("/api/v1/equipment/{$equipment->id}")
        ->assertForbidden();

    expect($equipment->fresh()->is_active)->toBeTrue();
});

it('returns generator details without inventing missing values', function () {
    $user = User::factory()->create();
    $category = EquipmentCategory::factory()->create(['code' => 'generator']);
    $equipment = Equipment::factory()->for($category, 'category')->create([
        'asset_code' => 'A.H-0010',
        'purchase_year' => null,
        'operational_situation' => null,
    ]);
    GeneratorDetail::factory()->for($equipment)->create([
        'voltage_rating' => '220/380',
        'tank_capacity_litres' => null,
    ]);

    $this
        ->actingAs($user, 'web')
        ->getJson("/api/v1/equipment/{$equipment->id}")
        ->assertOk()
        ->assertJsonPath('data.asset_code', 'A.H-0010')
        ->assertJsonPath('data.purchase_year', null)
        ->assertJsonPath('data.operational_situation', null)
        ->assertJsonPath('data.generator_details.voltage_rating', '220/380')
        ->assertJsonPath('data.generator_details.tank_capacity_litres', null)
        ->assertJsonMissingPath('data.password');
});

it('allows a generator manager to fill every inventory field without changing the asset code', function () {
    $manager = User::factory()->create(['role' => UserRole::GeneratorManager]);
    EquipmentCategory::factory()->create(['code' => 'generator']);
    $custodian = Employee::factory()->create(['name' => 'Jean Responsable']);
    $equipment = Equipment::factory()->create([
        'asset_code' => 'A.H-001',
        'brand' => null,
    ]);

    $payload = [
        'brand' => 'KOHLER',
        'model' => 'B165',
        'serial_number' => '34LNGLH0009',
        'purchase_year' => 2023,
        'condition' => 'functional',
        'operational_situation' => 'in_use',
        'custodian_employee_id' => $custodian->id,
        'observations' => 'Essai en charge validé.',
        'generator_details' => [
            'apparent_power_kva' => 150,
            'active_power_kw' => 120,
            'phases' => '3 PH',
            'voltage_rating' => '400',
            'frequency_hz' => 50,
            'current_rating' => '216',
            'fuel_type' => 'GASOIL',
            'tank_capacity_litres' => 470,
            'current_engine_hours' => 1250.5,
        ],
    ];

    $this
        ->actingAs($manager, 'web')
        ->patchJson("/api/v1/equipment/{$equipment->id}", $payload)
        ->assertOk()
        ->assertJsonPath('data.asset_code', 'A.H-001')
        ->assertJsonPath('data.brand', 'KOHLER')
        ->assertJsonPath('data.custodian.name', 'Jean Responsable')
        ->assertJsonPath('data.generator_details.current_rating', '216');

    $this->assertDatabaseHas('equipment', [
        'id' => $equipment->id,
        'asset_code' => 'A.H-001',
        'custodian_employee_id' => $custodian->id,
    ]);
    $this->assertDatabaseHas('equipment_changes', [
        'equipment_id' => $equipment->id,
        'change_type' => 'specifications_updated',
    ]);
});

it('allows a generator manager to change the assigned site and physical location', function () {
    $manager = User::factory()->create(['role' => UserRole::GeneratorManager]);
    $equipment = Equipment::factory()->create();
    GeneratorDetail::factory()->for($equipment)->create();
    $oldProject = Project::factory()->create();
    $newProject = Project::factory()->create();
    $oldLocation = Location::factory()->for($oldProject)->create();
    $newLocation = Location::factory()->for($newProject)->create();
    $assignment = EquipmentProjectAssignment::factory()->for($equipment)->for($oldProject)->create();
    $equipment->update(['current_location_id' => $oldLocation->id]);

    $payload = [
        'brand' => $equipment->brand,
        'model' => $equipment->model,
        'serial_number' => $equipment->serial_number,
        'purchase_year' => $equipment->purchase_year,
        'condition' => $equipment->condition->value,
        'operational_situation' => $equipment->operational_situation?->value,
        'project_id' => $newProject->id,
        'current_location_id' => $newLocation->id,
        'custodian_employee_id' => null,
        'observations' => null,
        'generator_details' => [
            'apparent_power_kva' => null, 'active_power_kw' => null, 'phases' => null,
            'voltage_rating' => null, 'frequency_hz' => null, 'current_rating' => null,
            'fuel_type' => null, 'tank_capacity_litres' => null, 'current_engine_hours' => null,
        ],
    ];

    $this
        ->actingAs($manager, 'web')
        ->patchJson("/api/v1/equipment/{$equipment->id}", $payload)
        ->assertOk()
        ->assertJsonPath('data.current_location.id', $newLocation->id)
        ->assertJsonPath('data.current_project_assignment.project.id', $newProject->id);

    expect($assignment->fresh()->ended_at)->not->toBeNull();
});

it('returns 422 when a physical location belongs to a different site', function () {
    $manager = User::factory()->create(['role' => UserRole::GeneratorManager]);
    $equipment = Equipment::factory()->create();
    GeneratorDetail::factory()->for($equipment)->create();
    $selectedProject = Project::factory()->create();
    $otherProject = Project::factory()->create();
    $otherLocation = Location::factory()->for($otherProject)->create();

    $payload = [
        'brand' => null,
        'model' => null,
        'serial_number' => null,
        'purchase_year' => null,
        'condition' => null,
        'operational_situation' => null,
        'project_id' => $selectedProject->id,
        'current_location_id' => $otherLocation->id,
        'custodian_employee_id' => null,
        'observations' => null,
        'generator_details' => [
            'apparent_power_kva' => null, 'active_power_kw' => null, 'phases' => null,
            'voltage_rating' => null, 'frequency_hz' => null, 'current_rating' => null,
            'fuel_type' => null, 'tank_capacity_litres' => null, 'current_engine_hours' => null,
        ],
    ];

    $this->actingAs($manager, 'web')
        ->patchJson("/api/v1/equipment/{$equipment->id}", $payload)
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['current_location_id']);
});

it('prevents a viewer from editing equipment', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $equipment = Equipment::factory()->create();

    $this
        ->actingAs($viewer, 'web')
        ->patchJson("/api/v1/equipment/{$equipment->id}", [])
        ->assertForbidden();
});

it('allows a generator manager to add a generator with an automatic code and complete fields', function () {
    $manager = User::factory()->create(['role' => UserRole::GeneratorManager]);
    EquipmentCategory::factory()->create(['code' => 'generator']);
    $project = Project::factory()->create();
    $location = Location::factory()->for($project)->create();

    $payload = [
        'brand' => 'KOHLER',
        'model' => 'KD110',
        'serial_number' => 'SERIAL-NEW',
        'purchase_year' => 2026,
        'condition' => 'functional',
        'operational_situation' => 'in_reserve',
        'custodian_employee_id' => null,
        'observations' => 'Nouveau groupe.',
        'project_id' => $project->id,
        'current_location_id' => $location->id,
        'generator_details' => [
            'apparent_power_kva' => 100,
            'active_power_kw' => 80,
            'phases' => '3 PH',
            'voltage_rating' => '400',
            'frequency_hz' => 50,
            'current_rating' => '144',
            'fuel_type' => 'GASOIL',
            'tank_capacity_litres' => 250,
            'current_engine_hours' => 0,
        ],
    ];

    $response = $this
        ->actingAs($manager, 'web')
        ->postJson('/api/v1/equipment', $payload)
        ->assertCreated()
        ->assertJsonPath('data.brand', 'KOHLER')
        ->assertJsonPath('data.current_location.id', $location->id)
        ->assertJsonPath('data.current_project_assignment.project.id', $project->id);

    $id = $response->json('data.id');
    expect($response->json('data.display_id'))->toBe(str_pad((string) $id, 3, '0', STR_PAD_LEFT));
    expect($response->json('data.asset_code'))->toBe('GEN-'.str_pad((string) $id, 3, '0', STR_PAD_LEFT));
});
