<?php

use App\Enums\UserRole;
use App\Models\CatalogOption;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

uses(LazilyRefreshDatabase::class);

it('allows CMS managers to create, translate, edit, and disable catalog values', function () {
    $manager = User::factory()->create(['role' => UserRole::CmsManager]);

    $response = $this->actingAs($manager, 'web')->postJson('/api/v1/catalog-options', [
        'group' => 'fuel_type',
        'code' => 'PETROL',
        'label_fr' => 'Essence',
        'label_ar' => 'بنزين',
        'color' => '#526070',
        'sort_order' => 20,
        'is_active' => true,
    ])->assertCreated()
        ->assertJsonPath('data.label_ar', 'بنزين');

    $optionId = $response->json('data.id');
    $this->actingAs($manager, 'web')->patchJson("/api/v1/catalog-options/{$optionId}", [
        'group' => 'fuel_type',
        'code' => 'PETROL',
        'label_fr' => 'Essence sans plomb',
        'label_ar' => 'بنزين',
        'color' => '#3367B0',
        'sort_order' => 21,
        'is_active' => true,
    ])->assertOk()
        ->assertJsonPath('data.label_fr', 'Essence sans plomb');

    $this->actingAs($manager, 'web')
        ->deleteJson("/api/v1/catalog-options/{$optionId}")
        ->assertNoContent();

    expect(CatalogOption::query()->findOrFail($optionId)->is_active)->toBeFalse();
});

it('returns 422 when an update tries to change a catalog technical code or group', function () {
    $manager = User::factory()->create(['role' => UserRole::CmsManager]);
    $option = CatalogOption::query()->where('group', 'fuel_type')->firstOrFail();

    $this->actingAs($manager, 'web')->patchJson("/api/v1/catalog-options/{$option->id}", [
        'group' => 'project_status',
        'code' => 'RENAMED',
        'label_fr' => $option->label_fr,
        'label_ar' => $option->label_ar,
        'color' => $option->color,
        'sort_order' => $option->sort_order,
        'is_active' => true,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['group', 'code']);
});

it('returns 403 when a viewer tries to change catalog values', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);

    $this->actingAs($viewer, 'web')->postJson('/api/v1/catalog-options', [])
        ->assertForbidden();
});
