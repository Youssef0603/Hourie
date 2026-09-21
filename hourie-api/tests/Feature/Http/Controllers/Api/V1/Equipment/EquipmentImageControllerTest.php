<?php

use App\Enums\UserRole;
use App\Models\Equipment;
use App\Models\EquipmentImage;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class);

it('allows equipment managers to upload and remove generator photos', function () {
    Storage::fake('equipment-images');
    $manager = User::factory()->create(['role' => UserRole::CmsManager]);
    $equipment = Equipment::factory()->create();

    $response = $this->actingAs($manager, 'web')->postJson("/api/v1/equipment/{$equipment->id}/images", [
        'images' => [UploadedFile::fake()->image('generator.jpg', 1200, 800)],
    ])->assertCreated()
        ->assertJsonPath('data.0.original_name', 'generator.jpg');

    $image = EquipmentImage::query()->firstOrFail();
    expect($image->disk)->toBe('equipment-images');
    Storage::disk('equipment-images')->assertExists($image->path);

    $this->actingAs($manager, 'web')
        ->deleteJson("/api/v1/equipment/{$equipment->id}/images/{$image->id}")
        ->assertNoContent();

    Storage::disk('equipment-images')->assertMissing($image->path);
    $this->assertDatabaseMissing('equipment_images', ['id' => $image->id]);
    expect($response->json('data.0.url'))->toContain("/equipment/{$equipment->id}/images/{$image->id}/file");
});

it('prevents viewers from uploading generator photos', function () {
    Storage::fake('equipment-images');
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $equipment = Equipment::factory()->create();

    $this->actingAs($viewer, 'web')->postJson("/api/v1/equipment/{$equipment->id}/images", [
        'images' => [UploadedFile::fake()->image('generator.jpg')],
    ])->assertForbidden();
});
