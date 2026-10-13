<?php

namespace App\Http\Controllers\Api\V1\Equipment;

use App\Enums\EquipmentChangeSource;
use App\Enums\EquipmentChangeType;
use App\Enums\VehicleDocumentType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Equipment\StoreEquipmentVehicleDocumentRequest;
use App\Models\Equipment;
use App\Models\EquipmentChange;
use App\Models\EquipmentVehicleDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EquipmentVehicleDocumentController extends Controller
{
    public function store(StoreEquipmentVehicleDocumentRequest $request, Equipment $equipment): JsonResponse
    {
        $file = $request->file('document');
        $disk = (string) config('filesystems.equipment_documents_disk');
        $path = $file->store("equipment/{$equipment->id}/vehicle-documents", $disk);

        $document = $equipment->vehicleDocuments()->create([
            'uploaded_by_user_id' => $request->user()->id,
            'document_type' => VehicleDocumentType::Other,
            'disk' => $disk,
            'path' => $path,
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?? 'application/pdf',
            'size_bytes' => $file->getSize(),
        ]);

        EquipmentChange::query()->create([
            'equipment_id' => $equipment->id,
            'actor_user_id' => $request->user()->id,
            'change_type' => EquipmentChangeType::VehicleDocumentAdded,
            'source' => EquipmentChangeSource::Manual,
            'new_values' => [
                'vehicle_document_id' => $document->id,
                'original_name' => $document->original_name,
            ],
            'occurred_at' => now(),
        ]);

        return response()->json([
            'data' => $this->serialize($equipment, $document->setRelation('uploader', $request->user())),
        ], 201);
    }

    public function show(Request $request, Equipment $equipment, EquipmentVehicleDocument $vehicleDocument): StreamedResponse
    {
        Gate::authorize('view', $equipment);
        abort_unless($vehicleDocument->equipment_id === $equipment->id, 404);

        $headers = [
            'Content-Type' => 'application/pdf',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ];

        if ($request->boolean('preview')) {
            return Storage::disk($vehicleDocument->disk)->response($vehicleDocument->path, $vehicleDocument->original_name, $headers, 'inline');
        }

        return Storage::disk($vehicleDocument->disk)->download($vehicleDocument->path, $vehicleDocument->original_name, $headers);
    }

    public function destroy(Equipment $equipment, EquipmentVehicleDocument $vehicleDocument): JsonResponse
    {
        Gate::authorize('update', $equipment);
        abort_unless($vehicleDocument->equipment_id === $equipment->id, 404);

        $metadata = [
            'vehicle_document_id' => $vehicleDocument->id,
            'original_name' => $vehicleDocument->original_name,
        ];
        Storage::disk($vehicleDocument->disk)->delete($vehicleDocument->path);
        $vehicleDocument->delete();

        EquipmentChange::query()->create([
            'equipment_id' => $equipment->id,
            'actor_user_id' => auth()->id(),
            'change_type' => EquipmentChangeType::VehicleDocumentDeleted,
            'source' => EquipmentChangeSource::Manual,
            'new_values' => $metadata,
            'occurred_at' => now(),
        ]);

        return response()->json(status: 204);
    }

    /** @return array<string, mixed> */
    private function serialize(Equipment $equipment, EquipmentVehicleDocument $document): array
    {
        return [
            'id' => $document->id,
            'url' => route('equipment.vehicle-documents.show', [$equipment, $document], false),
            'original_name' => $document->original_name,
            'mime_type' => $document->mime_type,
            'size_bytes' => $document->size_bytes,
            'uploaded_by' => $document->uploader === null ? null : [
                'id' => $document->uploader->id,
                'name' => $document->uploader->name,
            ],
            'created_at' => $document->created_at->toISOString(),
        ];
    }
}
