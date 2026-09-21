<?php

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(LazilyRefreshDatabase::class);

it('creates an internal user with a securely hashed password', function () {
    $this->artisan('users:create')
        ->expectsQuestion('Nom complet', 'Marie Koné')
        ->expectsQuestion('Nom d’utilisateur', ' MARIE.KONE ')
        ->expectsQuestion('Adresse e-mail (facultative)', '')
        ->expectsQuestion('Mot de passe (12 caractères minimum)', 'a-secure-password')
        ->expectsQuestion('Confirmez le mot de passe', 'a-secure-password')
        ->expectsOutput('Le compte interne a été créé.')
        ->assertSuccessful();

    $user = User::query()->where('username', 'marie.kone')->firstOrFail();

    expect($user->name)->toBe('Marie Koné');
    expect($user->email)->toBeNull();
    expect(Hash::check('a-secure-password', $user->password))->toBeTrue();
    expect($user->must_change_password)->toBeTrue();
    expect($user->employee)->not->toBeNull();
    expect($user->employee->name)->toBe('Marie Koné');
});

it('creates a linked employee profile for a generator manager', function () {
    $this->artisan('users:create --role=generator_manager')
        ->expectsQuestion('Nom complet', 'Jean Responsable')
        ->expectsQuestion('Nom d’utilisateur', 'jean.responsable')
        ->expectsQuestion('Adresse e-mail (facultative)', 'jean@hourie.test')
        ->expectsQuestion('Mot de passe (12 caractères minimum)', 'a-secure-password')
        ->expectsQuestion('Confirmez le mot de passe', 'a-secure-password')
        ->assertSuccessful();

    $user = User::query()->where('email', 'jean@hourie.test')->firstOrFail();

    expect($user->role)->toBe(UserRole::GeneratorManager);
    expect($user->employee)->not->toBeNull();
    expect($user->employee->name)->toBe('Jean Responsable');
});

it('rejects a username that already belongs to a user', function () {
    User::factory()->create(['username' => 'marie.kone']);

    $this->artisan('users:create')
        ->expectsQuestion('Nom complet', 'Marie Koné')
        ->expectsQuestion('Nom d’utilisateur', 'marie.kone')
        ->expectsQuestion('Adresse e-mail (facultative)', '')
        ->expectsQuestion('Mot de passe (12 caractères minimum)', 'a-secure-password')
        ->expectsQuestion('Confirmez le mot de passe', 'a-secure-password')
        ->expectsOutput('La valeur du champ nom d’utilisateur est déjà utilisée.')
        ->assertFailed();

    expect(User::query()->where('username', 'marie.kone')->count())->toBe(1);
});
