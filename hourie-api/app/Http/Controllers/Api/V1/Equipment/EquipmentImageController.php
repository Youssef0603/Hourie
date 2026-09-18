<?php

namespace App\Http\Controllers\Api\V1\Equipment;

use App\Enums\EquipmentChangeSource;
use App\Enums\EquipmentChangeType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Equipment\StoreEquipmentImagesRequest;
use App\Models\Equipment;
use App\Models\EquipmentChange;
use App\Models\EquipmentImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EquipmentImageController extends Controller
{
    public function store(StoreEquipmentImagesRequest $request, Equipment $equipment): JsonResponse
    {
        $images = collect($request->file('images', []))->map(function ($file, int $index) use ($equipment, $request): EquipmentImage {
            $path = $file->store("equipment/{$equipment->id}", 'public');

            $image = $equipment->images()->create([
                'uploaded_by_user_id' => $request->user()->id,
                'disk' => 'public',
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType() ?? 'application/octet-stream',
                'size_bytes' => $file->getSize(),
                'sort_order' => ($equipment->images()->max('sort_order') ?? -1) + $index + 1,
            ]);

            EquipmentChange::query()->create([
                'equipment_id' => $equipment->id,
                'actor_user_id' => $request->user()->id,
                'change_type' => EquipmentChangeType::ImageAdded,
                'source' => EquipmentChangeSource::Manual,
                'new_values' => ['image_id' => $image->id, 'original_name' => $image->original_name],
                'occurred_at' => now(),
            ]);

            return $image;
        });

        return response()->json(['data' => $images->map(fn (EquipmentImage $image) => $this->serialize($equipment, $image))], 201);
    }

    public function show(Equipment $equipment, EquipmentImage $image): StreamedResponse
    {
        Gate::authorize('view', $equipment);
        abort_unless($image->equipment_id === $equipment->id, 404);

        return Storage::disk($image->disk)->response($image->path, $image->original_name, [
            'Content-Type' => $image->mime_type,
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    public function destroy(Equipment $equipment, EquipmentImage $image): JsonResponse
    {
        Gate::authorize('update', $equipment);
        abort_unless($image->equipment_id === $equipment->id, 404);

        $metadata = ['image_id' => $image->id, 'original_name' => $image->original_name];
        Storage::disk($image->disk)->delete($image->path);
        $image->delete();

        EquipmentChange::query()->create([
            'equipment_id' => $equipment->id,
            'actor_user_id' => auth()->id(),
            'change_type' => EquipmentChangeType::ImageDeleted,
            'source' => EquipmentChangeSource::Manual,
            'new_values' => $metadata,
            'occurred_at' => now(),
        ]);

        return response()->json(status: 204);
    }

    /** @return array<string, mixed> */
    private function serialize(Equipment $equipment, EquipmentImage $image): array
    {
        return [
            'id' => $image->id,
            'url' => route('equipment.images.show', [$equipment, $image], false),
            'original_name' => $image->original_name,
            'mime_type' => $image->mime_type,
            'size_bytes' => $image->size_bytes,
            'created_at' => $image->created_at->toISOString(),
        ];
    }
}
