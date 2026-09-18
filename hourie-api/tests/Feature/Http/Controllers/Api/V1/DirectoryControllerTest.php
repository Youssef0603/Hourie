<?php

use App\Enums\UserRole;
use App\Models\Employee;
use App\Models\Equipment;
use App\Models\EquipmentProjectAssignment;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(LazilyRefreshDatabase::class);

it('lists sites and personnel for authenticated users', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    Project::factory()->create(['name' => 'BASSAM']);
    Employee::factory()->for($viewer)->create(['name' => 'Jean Responsable']);

    $this->actingAs($viewer, 'web')->getJson('/api/v1/sites')
        ->assertOk()->assertJsonPath('data.0.name', 'BASSAM');
    $this->actingAs($viewer, 'web')->getJson('/api/v1/employees')
        ->assertOk()
        ->assertJsonPath('data.0.name', 'Jean Responsable')
        ->assertJsonPath('data.0.user.email', $viewer->email);
});

it('prevents viewers from adding sites', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);

    $this->actingAs($viewer, 'web')->postJson('/api/v1/sites', ['name' => 'SAN PEDRO'])
        ->assertForbidden();
});

it('allows CMS managers to add sites without granting user administration', function () {
    $cmsManager = User::factory()->create(['role' => UserRole::CmsManager]);

    $this->actingAs($cmsManager, 'web')->postJson('/api/v1/sites', [
        'name' => 'ABIDJAN NORD',
        'status' => 'active',
        'locations' => ['BASE'],
    ])->assertCreated();

    $this->actingAs($cmsManager, 'web')->postJson('/api/v1/employees', [
        'name' => 'Utilisateur interdit',
    ])->assertForbidden();
});

it('shows a site with its locations and current equipment inventory', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $site = Project::factory()->create(['name' => 'BASSAM']);
    $equipment = Equipment::factory()->create(['asset_code' => 'A.H-001']);
    EquipmentProjectAssignment::factory()->create([
        'project_id' => $site->id,
        'equipment_id' => $equipment->id,
        'ended_at' => null,
    ]);

    $this->actingAs($viewer, 'web')->getJson("/api/v1/sites/{$site->id}")
        ->assertOk()
        ->assertJsonPath('data.name', 'BASSAM')
        ->assertJsonPath('data.equipment.0.asset_code', 'A.H-001');
});

it('shows personnel details with their assigned equipment', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $employee = Employee::factory()->for($viewer)->create([
        'name' => 'Jean Responsable',
        'phone_number' => '+225 01 02 03 04 05',
    ]);
    Equipment::factory()->create([
        'asset_code' => 'A.H-010',
        'custodian_employee_id' => $employee->id,
    ]);

    $this->actingAs($viewer, 'web')->getJson("/api/v1/employees/{$employee->id}")
        ->assertOk()
        ->assertJsonPath('data.name', 'Jean Responsable')
        ->assertJsonPath('data.phone_number', '+225 01 02 03 04 05')
        ->assertJsonPath('data.user.email', $viewer->email)
        ->assertJsonPath('data.equipment_in_custody_count', 1)
        ->assertJsonPath('data.equipment_in_custody.0.asset_code', 'A.H-010');
});

it('allows managers to update personnel and their login account', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $account = User::factory()->create(['role' => UserRole::Viewer]);
    $employee = Employee::factory()->for($account)->create(['name' => 'Ancien nom']);
    $originalPassword = $account->password;

    $this->actingAs($manager, 'web')->patchJson("/api/v1/employees/{$employee->id}", [
        'name' => 'Nouveau nom',
        'phone_number' => '+225 05 06 07 08 09',
        'email' => 'nouveau@hourie.ci',
        'role' => 'generator_manager',
        'password' => null,
        'password_confirmation' => null,
    ])->assertOk()
        ->assertJsonPath('data.name', 'Nouveau nom')
        ->assertJsonPath('data.user.email', 'nouveau@hourie.ci')
        ->assertJsonPath('data.user.role', 'generator_manager');

    $account->refresh();
    expect($account->password)->toBe($originalPassword);
    $this->assertDatabaseHas('employees', [
        'id' => $employee->id,
        'name' => 'Nouveau nom',
        'phone_number' => '+225 05 06 07 08 09',
    ]);
});

it('allows managers to add sites and personnel', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $this->actingAs($manager, 'web')->postJson('/api/v1/sites', [
        'name' => 'SAN PEDRO',
        'status' => 'active',
        'address' => 'Zone industrielle, San Pedro',
        'start_date' => '2026-10-01',
        'expected_end_date' => '2027-09-30',
        'notes' => 'Nouveau chantier portuaire.',
        'locations' => ['BASE', 'CENTRALE'],
    ])->assertCreated()
        ->assertJsonPath('data.address', 'Zone industrielle, San Pedro')
        ->assertJsonPath('data.changes.0.actor.name', $manager->name)
        ->assertJsonPath('data.changes.0.action', 'created')
        ->assertJsonFragment(['name' => 'BASE', 'location_type' => 'project_area'])
        ->assertJsonFragment(['name' => 'CENTRALE', 'location_type' => 'project_area']);

    $this->actingAs($manager, 'web')->postJson('/api/v1/employees', [
        'name' => 'Awa Koné',
        'phone_number' => '+225 07 08 09 10 11',
        'email' => 'awa.kone@hourie.ci',
        'role' => 'generator_manager',
        'password' => 'Temporary-2026',
        'password_confirmation' => 'Temporary-2026',
    ])->assertCreated()
        ->assertJsonPath('data.name', 'Awa Koné')
        ->assertJsonPath('data.phone_number', '+225 07 08 09 10 11')
        ->assertJsonPath('data.user.email', 'awa.kone@hourie.ci')
        ->assertJsonPath('data.user.role', 'generator_manager')
        ->assertJsonPath('data.equipment_in_custody_count', 0);

    $account = User::query()->where('email', 'awa.kone@hourie.ci')->firstOrFail();

    expect(Hash::check('Temporary-2026', $account->password))->toBeTrue();
    $this->assertDatabaseHas('employees', ['user_id' => $account->id, 'name' => 'Awa Koné']);

    $this->app['auth']->guard('web')->logout();
    $this->app['auth']->forgetGuards();
    $this->withHeader('Origin', 'http://localhost:5173')
        ->postJson('/api/v1/auth/login', [
            'email' => 'awa.kone@hourie.ci',
            'password' => 'Temporary-2026',
        ])
        ->assertOk()
        ->assertJsonPath('data.id', $account->id)
        ->assertJsonPath('data.role', 'generator_manager');
});
