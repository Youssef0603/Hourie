<?php

use App\Enums\UserRole;
use App\Models\Equipment;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Gate;

uses(LazilyRefreshDatabase::class);

test('viewers can view equipment but cannot modify it', function () {
    $user = User::factory()->create(['role' => UserRole::Viewer]);
    $equipment = Equipment::factory()->create();

    expect(Gate::forUser($user)->allows('viewAny', Equipment::class))->toBeTrue();
    expect(Gate::forUser($user)->allows('view', $equipment))->toBeTrue();
    expect(Gate::forUser($user)->allows('create', Equipment::class))->toBeFalse();
    expect(Gate::forUser($user)->allows('update', $equipment))->toBeFalse();
    expect(Gate::forUser($user)->allows('delete', $equipment))->toBeFalse();
});

test('system managers and managers have full equipment control', function () {
    $generatorManager = User::factory()->create(['role' => UserRole::GeneratorManager]);
    $systemManager = User::factory()->create(['role' => UserRole::CmsManager]);
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $equipment = Equipment::factory()->create();

    expect(Gate::forUser($generatorManager)->allows('update', $equipment))->toBeTrue();
    expect(Gate::forUser($generatorManager)->allows('delete', $equipment))->toBeFalse();
    expect(Gate::forUser($systemManager)->allows('create', Equipment::class))->toBeTrue();
    expect(Gate::forUser($systemManager)->allows('delete', $equipment))->toBeTrue();
    expect(Gate::forUser($manager)->allows('create', Equipment::class))->toBeTrue();
    expect(Gate::forUser($manager)->allows('delete', $equipment))->toBeTrue();
});
