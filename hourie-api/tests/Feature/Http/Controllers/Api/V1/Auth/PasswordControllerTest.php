<?php

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(LazilyRefreshDatabase::class);

it('blocks application access until an initial password is changed', function () {
    $user = User::factory()->create(['must_change_password' => true]);

    $this->actingAs($user)
        ->getJson('/api/v1/equipment')
        ->assertForbidden()
        ->assertJson([
            'code' => 'password_change_required',
            'message' => 'Vous devez modifier votre mot de passe initial avant de continuer.',
        ]);

    $this->actingAs($user)
        ->getJson('/api/v1/auth/user')
        ->assertOk()
        ->assertJsonPath('data.must_change_password', true);
});

it('changes an initial password and unlocks application access', function () {
    $user = User::factory()->create([
        'password' => 'Initial-password-2026',
        'must_change_password' => true,
        'remember_token' => 'old-remember-token',
    ]);

    $this->actingAs($user)
        ->putJson('/api/v1/auth/password', [
            'current_password' => 'Initial-password-2026',
            'password' => 'Personal-password-2026',
            'password_confirmation' => 'Personal-password-2026',
        ])
        ->assertOk()
        ->assertJsonPath('data.must_change_password', false);

    $user->refresh();

    expect(Hash::check('Personal-password-2026', $user->password))->toBeTrue()
        ->and($user->must_change_password)->toBeFalse()
        ->and($user->remember_token)->not->toBe('old-remember-token');

    $this->getJson('/api/v1/equipment')->assertOk();
});

it('rejects an incorrect current password without changing the account', function () {
    $user = User::factory()->create([
        'password' => 'Initial-password-2026',
        'must_change_password' => true,
    ]);

    $this->actingAs($user)
        ->putJson('/api/v1/auth/password', [
            'current_password' => 'Wrong-password-2026',
            'password' => 'Personal-password-2026',
            'password_confirmation' => 'Personal-password-2026',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['current_password']);

    $user->refresh();

    expect(Hash::check('Initial-password-2026', $user->password))->toBeTrue()
        ->and($user->must_change_password)->toBeTrue();
});

it('requires authentication to change a password', function () {
    $this->putJson('/api/v1/auth/password', [
        'current_password' => 'Initial-password-2026',
        'password' => 'Personal-password-2026',
        'password_confirmation' => 'Personal-password-2026',
    ])->assertUnauthorized();
});
