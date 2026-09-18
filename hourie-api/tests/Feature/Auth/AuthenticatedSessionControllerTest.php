<?php

use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(LazilyRefreshDatabase::class);

it('authenticates a valid user and returns the current user', function () {
    $user = User::factory()->create([
        'email' => 'manager@hourie.test',
        'password' => Hash::make('correct-password'),
    ]);

    $response = $this
        ->withHeader('Origin', 'http://localhost:5173')
        ->postJson('/api/v1/auth/login', [
            'email' => ' Manager@Hourie.Test ',
            'password' => 'correct-password',
            'remember' => true,
        ]);

    $response
        ->assertOk()
        ->assertJson([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => 'manager@hourie.test',
            ],
        ])
        ->assertJsonMissingPath('data.password');
    $this->assertAuthenticatedAs($user, 'web');
});

it('returns 422 with a French message for invalid credentials', function () {
    User::factory()->create([
        'email' => 'manager@hourie.test',
        'password' => Hash::make('correct-password'),
    ]);

    $response = $this
        ->withHeader('Origin', 'http://localhost:5173')
        ->postJson('/api/v1/auth/login', [
            'email' => 'manager@hourie.test',
            'password' => 'incorrect-password',
        ]);

    $response
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email'])
        ->assertJsonPath('errors.email.0', 'Les identifiants fournis sont incorrects.');
    $this->assertGuest('web');
});

it('returns 422 with French validation messages when credentials are missing', function () {
    $response = $this
        ->withHeader('Origin', 'http://localhost:5173')
        ->postJson('/api/v1/auth/login');

    $response
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email', 'password'])
        ->assertJsonPath('errors.email.0', 'Le champ adresse e-mail est obligatoire.')
        ->assertJsonPath('errors.password.0', 'Le champ mot de passe est obligatoire.');
});

it('returns Arabic validation messages when Arabic is requested', function () {
    $this
        ->withHeaders([
            'Origin' => 'http://localhost:5173',
            'Accept-Language' => 'ar',
        ])
        ->postJson('/api/v1/auth/login')
        ->assertUnprocessable()
        ->assertJsonPath('errors.email.0', 'حقل البريد الإلكتروني مطلوب.')
        ->assertJsonPath('errors.password.0', 'حقل كلمة المرور مطلوب.');
});

it('returns 429 after five login attempts for the same email and address', function () {
    foreach (range(1, 5) as $attempt) {
        $this
            ->withHeader('Origin', 'http://localhost:5173')
            ->postJson('/api/v1/auth/login', [
                'email' => 'unknown@hourie.test',
                'password' => 'incorrect-password',
            ])
            ->assertUnprocessable();
    }

    $this
        ->withHeader('Origin', 'http://localhost:5173')
        ->postJson('/api/v1/auth/login', [
            'email' => 'unknown@hourie.test',
            'password' => 'incorrect-password',
        ])
        ->assertTooManyRequests();
});

it('returns 401 when the current user is requested without authentication', function () {
    $this->getJson('/api/v1/auth/user')->assertUnauthorized();
});

it('returns the authenticated current user', function () {
    $user = User::factory()->create();

    $this
        ->actingAs($user, 'web')
        ->getJson('/api/v1/auth/user')
        ->assertOk()
        ->assertJson([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
            ],
        ]);
});

it('logs out an authenticated user and invalidates the session', function () {
    $user = User::factory()->create();

    $this
        ->actingAs($user, 'web')
        ->withHeader('Origin', 'http://localhost:5173')
        ->postJson('/api/v1/auth/logout')
        ->assertNoContent();

    $this->assertGuest('web');
});

it('does not expose a public registration endpoint', function () {
    $this
        ->withHeader('Origin', 'http://localhost:5173')
        ->postJson('/api/v1/auth/register', [
            'name' => 'Unauthorized User',
            'email' => 'unauthorized@hourie.test',
            'password' => 'password',
        ])
        ->assertNotFound();
});
