<?php

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;

uses(LazilyRefreshDatabase::class);

it('requires authentication to import equipment', function () {
    $this->postJson('/api/v1/equipment-imports')->assertUnauthorized();
});

it('prevents a viewer from importing equipment', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);

    $this
        ->actingAs($viewer, 'web')
        ->postJson('/api/v1/equipment-imports', [
            'file' => UploadedFile::fake()->create('inventory.xlsx', 10),
        ])
        ->assertForbidden();
});

it('accepts only xlsx inventory files', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);

    $this
        ->actingAs($manager, 'web')
        ->postJson('/api/v1/equipment-imports', [
            'file' => UploadedFile::fake()->create('inventory.csv', 10, 'text/csv'),
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('file');
});
