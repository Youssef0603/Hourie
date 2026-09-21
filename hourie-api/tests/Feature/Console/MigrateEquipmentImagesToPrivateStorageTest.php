<?php

use App\Models\Equipment;
use App\Models\EquipmentImage;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class);

it('moves legacy public equipment images to private storage', function () {
    Storage::fake('public');
    Storage::fake('equipment-images');
    $equipment = Equipment::factory()->create();
    $uploader = User::factory()->create();
    $path = "equipment/{$equipment->id}/generator.jpg";
    Storage::disk('public')->put($path, 'private photo contents');
    $image = EquipmentImage::query()->create([
        'equipment_id' => $equipment->id,
        'uploaded_by_user_id' => $uploader->id,
        'disk' => 'public',
        'path' => $path,
        'original_name' => 'generator.jpg',
        'mime_type' => 'image/jpeg',
        'size_bytes' => 22,
        'sort_order' => 0,
    ]);

    $this->artisan('equipment-images:migrate-private')
        ->expectsOutput('Migrated 1 image(s) to equipment-images.')
        ->assertSuccessful();

    expect($image->fresh()->disk)->toBe('equipment-images');
    Storage::disk('equipment-images')->assertExists($path);
    Storage::disk('public')->assertMissing($path);
});
