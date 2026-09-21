<?php

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

uses(LazilyRefreshDatabase::class);

it('returns 401 and clears the session when an authenticated user is inactive', function () {
    $user = User::factory()->create(['is_active' => false]);

    $this->actingAs($user, 'web')
        ->getJson('/api/v1/auth/user')
        ->assertUnauthorized()
        ->assertJsonPath('message', __('auth.inactive'));

    $this->assertGuest('web');
});

it('allows an active authenticated user to continue', function () {
    $user = User::factory()->create(['is_active' => true]);

    $this->actingAs($user, 'web')
        ->getJson('/api/v1/auth/user')
        ->assertOk()
        ->assertJsonPath('data.id', $user->id);
});
