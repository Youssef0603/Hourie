<?php

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(LazilyRefreshDatabase::class);

it('creates an internal user with a securely hashed password', function () {
    $this->artisan('users:create')
        ->expectsQuestion('Nom complet', 'Marie Koné')
        ->expectsQuestion('Adresse e-mail', ' MARIE@HOURIE.TEST ')
        ->expectsQuestion('Mot de passe (12 caractères minimum)', 'a-secure-password')
        ->expectsQuestion('Confirmez le mot de passe', 'a-secure-password')
        ->expectsOutput('Le compte interne a été créé.')
        ->assertSuccessful();

    $user = User::query()->where('email', 'marie@hourie.test')->firstOrFail();

    expect($user->name)->toBe('Marie Koné');
    expect(Hash::check('a-secure-password', $user->password))->toBeTrue();
    expect($user->employee)->not->toBeNull();
    expect($user->employee->name)->toBe('Marie Koné');
});

it('creates a linked employee profile for a generator manager', function () {
    $this->artisan('users:create --role=generator_manager')
        ->expectsQuestion('Nom complet', 'Jean Responsable')
        ->expectsQuestion('Adresse e-mail', 'jean@hourie.test')
        ->expectsQuestion('Mot de passe (12 caractères minimum)', 'a-secure-password')
        ->expectsQuestion('Confirmez le mot de passe', 'a-secure-password')
        ->assertSuccessful();

    $user = User::query()->where('email', 'jean@hourie.test')->firstOrFail();

    expect($user->role)->toBe(UserRole::GeneratorManager);
    expect($user->employee)->not->toBeNull();
    expect($user->employee->name)->toBe('Jean Responsable');
});

it('rejects an email address that already belongs to a user', function () {
    User::factory()->create(['email' => 'marie@hourie.test']);

    $this->artisan('users:create')
        ->expectsQuestion('Nom complet', 'Marie Koné')
        ->expectsQuestion('Adresse e-mail', 'marie@hourie.test')
        ->expectsQuestion('Mot de passe (12 caractères minimum)', 'a-secure-password')
        ->expectsQuestion('Confirmez le mot de passe', 'a-secure-password')
        ->expectsOutput('La valeur du champ adresse e-mail est déjà utilisée.')
        ->assertFailed();

    expect(User::query()->where('email', 'marie@hourie.test')->count())->toBe(1);
});
