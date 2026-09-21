<?php

use App\Enums\UserRole;
use App\Models\Employee;
use App\Models\Equipment;
use App\Models\EquipmentProjectAssignment;
use App\Models\Location;
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
        ->assertJsonPath('data.0.user.username', $viewer->username)
        ->assertJsonPath('data.0.user.email', $viewer->email);
});

it('prevents viewers from adding sites', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);

    $this->actingAs($viewer, 'web')->postJson('/api/v1/sites', ['name' => 'SAN PEDRO'])
        ->assertForbidden();
});

it('allows CMS managers to add sites', function () {
    $cmsManager = User::factory()->create(['role' => UserRole::CmsManager]);
    $responsible = Employee::factory()->create();

    $this->actingAs($cmsManager, 'web')->postJson('/api/v1/sites', [
        'name' => 'ABIDJAN NORD',
        'status' => 'active',
        'responsible_employee_id' => $responsible->id,
        'locations' => ['BASE'],
    ])->assertCreated();
});

it('allows CMS managers to create personnel and non-manager accounts', function () {
    $cmsManager = User::factory()->create(['role' => UserRole::CmsManager]);

    $this->actingAs($cmsManager, 'web')->postJson('/api/v1/employees', [
        'name' => 'Awa Koné',
        'phone_number' => '+225 07 08 09 10 11',
        'email' => null,
        'role' => 'generator_manager',
        'password' => 'Temporary-2026',
        'password_confirmation' => 'Temporary-2026',
    ])->assertCreated()
        ->assertJsonPath('data.user.username', 'awa.kone')
        ->assertJsonPath('data.user.role', 'generator_manager');

    $this->assertDatabaseHas('users', [
        'username' => 'awa.kone',
        'role' => 'generator_manager',
    ]);

    $this->actingAs($cmsManager, 'web')->getJson('/api/v1/auth/user')
        ->assertOk()
        ->assertJsonPath('data.permissions.manage_users', true)
        ->assertJsonPath('data.permissions.manage_manager_accounts', false);
});

it('allows CMS managers to edit and remove non-manager personnel accounts', function () {
    $cmsManager = User::factory()->create(['role' => UserRole::CmsManager]);
    $account = User::factory()->create(['role' => UserRole::Viewer]);
    $employee = Employee::factory()->for($account)->create(['name' => 'Ancien nom']);

    $this->actingAs($cmsManager, 'web')->patchJson("/api/v1/employees/{$employee->id}", [
        'name' => 'Nouveau nom',
        'phone_number' => null,
        'username' => $account->username,
        'email' => $account->email,
        'role' => 'generator_manager',
        'password' => null,
        'password_confirmation' => null,
    ])->assertOk()
        ->assertJsonPath('data.name', 'Nouveau nom')
        ->assertJsonPath('data.user.role', 'generator_manager');

    $this->actingAs($cmsManager, 'web')
        ->deleteJson("/api/v1/employees/{$employee->id}")
        ->assertNoContent();

    expect($employee->fresh()->is_active)->toBeFalse();
    expect($account->fresh()->is_active)->toBeFalse();
});

it('prevents CMS managers from creating or promoting manager accounts', function () {
    $cmsManager = User::factory()->create(['role' => UserRole::CmsManager]);
    $viewerAccount = User::factory()->create(['role' => UserRole::Viewer]);
    $viewerEmployee = Employee::factory()->for($viewerAccount)->create();

    $this->actingAs($cmsManager, 'web')->postJson('/api/v1/employees', [
        'name' => 'Manager interdit',
        'phone_number' => null,
        'email' => null,
        'role' => 'manager',
        'password' => 'Temporary-2026',
        'password_confirmation' => 'Temporary-2026',
    ])->assertForbidden();

    $this->actingAs($cmsManager, 'web')->patchJson("/api/v1/employees/{$viewerEmployee->id}", [
        'name' => $viewerEmployee->name,
        'phone_number' => null,
        'username' => $viewerAccount->username,
        'email' => $viewerAccount->email,
        'role' => 'manager',
        'password' => null,
        'password_confirmation' => null,
    ])->assertForbidden();

    expect($viewerAccount->fresh()->role)->toBe(UserRole::Viewer);
    $this->assertDatabaseMissing('users', ['name' => 'Manager interdit']);
});

it('prevents CMS managers from modifying or removing an existing manager', function () {
    $cmsManager = User::factory()->create(['role' => UserRole::CmsManager]);
    $managerAccount = User::factory()->create(['role' => UserRole::Manager]);
    $managerEmployee = Employee::factory()->for($managerAccount)->create();

    $this->actingAs($cmsManager, 'web')->patchJson("/api/v1/employees/{$managerEmployee->id}", [
        'name' => 'Nom interdit',
        'phone_number' => null,
        'username' => $managerAccount->username,
        'email' => $managerAccount->email,
        'role' => 'viewer',
        'password' => null,
        'password_confirmation' => null,
    ])->assertForbidden();

    $this->actingAs($cmsManager, 'web')
        ->deleteJson("/api/v1/employees/{$managerEmployee->id}")
        ->assertForbidden();

    expect($managerEmployee->fresh()->is_active)->toBeTrue();
    expect($managerAccount->fresh()->role)->toBe(UserRole::Manager);
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
        ->assertJsonPath('data.user.username', $viewer->username)
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
        'username' => 'nouveau.nom',
        'email' => 'nouveau@hourie.ci',
        'role' => 'generator_manager',
        'password' => null,
        'password_confirmation' => null,
    ])->assertOk()
        ->assertJsonPath('data.name', 'Nouveau nom')
        ->assertJsonPath('data.user.username', 'nouveau.nom')
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
    $responsible = Employee::factory()->create(['name' => 'Responsable SAN PEDRO']);
    $this->actingAs($manager, 'web')->postJson('/api/v1/sites', [
        'name' => 'SAN PEDRO',
        'status' => 'active',
        'responsible_employee_id' => $responsible->id,
        'address' => 'Zone industrielle, San Pedro',
        'start_date' => '2026-10-01',
        'expected_end_date' => '2027-09-30',
        'notes' => 'Nouveau chantier portuaire.',
        'locations' => ['BASE', 'CENTRALE'],
    ])->assertCreated()
        ->assertJsonPath('data.address', 'Zone industrielle, San Pedro')
        ->assertJsonPath('data.responsible.id', $responsible->id)
        ->assertJsonPath('data.changes.0.actor.name', $manager->name)
        ->assertJsonPath('data.changes.0.action', 'created')
        ->assertJsonFragment(['name' => 'BASE', 'location_type' => 'project_area'])
        ->assertJsonFragment(['name' => 'CENTRALE', 'location_type' => 'project_area']);

    $this->actingAs($manager, 'web')->postJson('/api/v1/employees', [
        'name' => 'Awa Koné',
        'phone_number' => '+225 07 08 09 10 11',
        'email' => null,
        'role' => 'generator_manager',
        'password' => 'Temporary-2026',
        'password_confirmation' => 'Temporary-2026',
    ])->assertCreated()
        ->assertJsonPath('data.name', 'Awa Koné')
        ->assertJsonPath('data.phone_number', '+225 07 08 09 10 11')
        ->assertJsonPath('data.user.username', 'awa.kone')
        ->assertJsonPath('data.user.email', null)
        ->assertJsonPath('data.user.role', 'generator_manager')
        ->assertJsonPath('data.equipment_in_custody_count', 0);

    $account = User::query()->where('username', 'awa.kone')->firstOrFail();

    expect(Hash::check('Temporary-2026', $account->password))->toBeTrue();
    expect($account->must_change_password)->toBeTrue();
    $this->assertDatabaseHas('employees', ['user_id' => $account->id, 'name' => 'Awa Koné']);

    $this->app['auth']->guard('web')->logout();
    $this->app['auth']->forgetGuards();
    $this->withHeader('Origin', 'http://localhost:5173')
        ->postJson('/api/v1/auth/login', [
            'login' => 'awa.kone',
            'password' => 'Temporary-2026',
        ])
        ->assertOk()
        ->assertJsonPath('data.id', $account->id)
        ->assertJsonPath('data.role', 'generator_manager');
});

it('adds a numeric suffix when the generated username already exists', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    User::factory()->create(['username' => 'awa.kone']);

    $this->actingAs($manager, 'web')->postJson('/api/v1/employees', [
        'name' => 'Awa Koné',
        'phone_number' => null,
        'email' => null,
        'role' => 'viewer',
        'password' => 'Temporary-2026',
        'password_confirmation' => 'Temporary-2026',
    ])->assertCreated()
        ->assertJsonPath('data.user.username', 'awa.kone2');

    $this->assertDatabaseHas('users', [
        'username' => 'awa.kone2',
        'email' => null,
    ]);
});

it('allows managers to remove personnel and disables their login', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $account = User::factory()->create(['role' => UserRole::Viewer]);
    $employee = Employee::factory()->for($account)->create();
    $equipment = Equipment::factory()->create(['custodian_employee_id' => $employee->id]);

    $this->actingAs($manager, 'web')
        ->deleteJson("/api/v1/employees/{$employee->id}")
        ->assertNoContent();

    expect($employee->fresh()->is_active)->toBeFalse();
    expect($account->fresh()->is_active)->toBeFalse();
    expect($equipment->fresh()->custodian_employee_id)->toBeNull();
});

it('returns 422 when a manager tries to remove their own personnel account', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $employee = Employee::factory()->for($manager)->create();

    $this->actingAs($manager, 'web')
        ->deleteJson("/api/v1/employees/{$employee->id}")
        ->assertUnprocessable();

    expect($employee->fresh()->is_active)->toBeTrue();
});

it('allows CMS managers to remove a site without deleting its generators', function () {
    $cmsManager = User::factory()->create(['role' => UserRole::CmsManager]);
    $site = Project::factory()->create();
    $location = Location::factory()->for($site)->create();
    $equipment = Equipment::factory()->for($location, 'currentLocation')->create();
    $assignment = EquipmentProjectAssignment::factory()->for($equipment)->for($site)->create(['ended_at' => null]);

    $this->actingAs($cmsManager, 'web')
        ->deleteJson("/api/v1/sites/{$site->id}")
        ->assertNoContent();

    expect($site->fresh()->is_active)->toBeFalse();
    expect($location->fresh()->is_active)->toBeFalse();
    expect($equipment->fresh()->current_location_id)->toBeNull();
    expect($assignment->fresh()->ended_at)->not->toBeNull();
    $this->assertDatabaseHas('equipment', ['id' => $equipment->id]);
    $this->assertDatabaseHas('project_changes', [
        'project_id' => $site->id,
        'actor_user_id' => $cmsManager->id,
        'action' => 'archived',
    ]);
});

it('allows CMS managers to edit a site, its locations, and records the actor', function () {
    $cmsManager = User::factory()->create(['role' => UserRole::CmsManager]);
    $responsible = Employee::factory()->create(['name' => 'Responsable chantier']);
    $site = Project::factory()->create(['name' => 'Ancien site', 'status' => 'active']);
    $parent = Location::factory()->for($site)->create(['parent_id' => null, 'location_type' => 'project_site']);
    $retained = Location::factory()->for($site)->create(['parent_id' => $parent->id, 'name' => 'BASE']);
    $removed = Location::factory()->for($site)->create(['parent_id' => $parent->id, 'name' => 'ATELIER']);
    $equipment = Equipment::factory()->for($removed, 'currentLocation')->create();

    $this->actingAs($cmsManager, 'web')->patchJson("/api/v1/sites/{$site->id}", [
        'name' => 'Nouveau site',
        'status' => 'on_hold',
        'responsible_employee_id' => $responsible->id,
        'address' => 'Zone 4',
        'start_date' => '2026-09-01',
        'expected_end_date' => '2027-09-01',
        'notes' => 'Planning mis à jour.',
        'locations' => [
            ['id' => $retained->id, 'name' => 'BASE PRINCIPALE'],
            ['id' => null, 'name' => 'CENTRALE'],
        ],
    ])->assertOk()
        ->assertJsonPath('data.name', 'Nouveau site')
        ->assertJsonPath('data.status', 'on_hold')
        ->assertJsonPath('data.responsible.id', $responsible->id)
        ->assertJsonPath('data.changes.0.action', 'updated')
        ->assertJsonPath('data.changes.0.actor.id', $cmsManager->id);

    expect($removed->fresh()->is_active)->toBeFalse();
    expect($equipment->fresh()->current_location_id)->toBeNull();
    $this->assertDatabaseHas('locations', ['id' => $retained->id, 'name' => 'BASE PRINCIPALE', 'is_active' => true]);
    $this->assertDatabaseHas('locations', ['project_id' => $site->id, 'name' => 'CENTRALE', 'is_active' => true]);
});

it('includes generators inherited from a site in personnel responsibility', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $responsible = Employee::factory()->create(['name' => 'Responsable BASSAM']);
    $site = Project::factory()->create(['responsible_employee_id' => $responsible->id]);
    $equipment = Equipment::factory()->create(['asset_code' => 'GEN-SITE', 'custodian_employee_id' => null]);
    EquipmentProjectAssignment::factory()->for($equipment)->for($site)->create(['ended_at' => null]);

    $this->actingAs($viewer, 'web')->getJson('/api/v1/employees')
        ->assertOk()
        ->assertJsonFragment([
            'id' => $responsible->id,
            'equipment_in_custody_count' => 1,
        ]);

    $this->actingAs($viewer, 'web')->getJson("/api/v1/employees/{$responsible->id}")
        ->assertOk()
        ->assertJsonPath('data.equipment_in_custody_count', 1)
        ->assertJsonPath('data.equipment_in_custody.0.asset_code', 'GEN-SITE')
        ->assertJsonPath('data.equipment_in_custody.0.responsible_source', 'site');
});

it('requires an active employee as the site responsible', function () {
    $cmsManager = User::factory()->create(['role' => UserRole::CmsManager]);
    $inactiveEmployee = Employee::factory()->create(['is_active' => false]);

    $this->actingAs($cmsManager, 'web')->postJson('/api/v1/sites', [
        'name' => 'SITE SANS RESPONSABLE',
        'status' => 'active',
        'responsible_employee_id' => $inactiveEmployee->id,
        'locations' => ['BASE'],
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['responsible_employee_id'])
        ->assertJsonPath('errors.responsible_employee_id.0', 'La valeur sélectionnée pour responsable du site est invalide.');
});
