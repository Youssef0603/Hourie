<?php

namespace App\Http\Controllers\Api\V1\Equipment;

use App\Enums\EquipmentChangeSource;
use App\Enums\EquipmentChangeType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Equipment\StoreEquipmentGeneratorDocumentsRequest;
use App\Models\Equipment;
use App\Models\EquipmentChange;
use App\Models\EquipmentGeneratorDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EquipmentGeneratorDocumentController extends Controller
{
    public function store(StoreEquipmentGeneratorDocumentsRequest $request, Equipment $equipment): JsonResponse
    {
        $documents = collect($request->file('documents', []))->map(function ($file) use ($equipment, $request): EquipmentGeneratorDocument {
            $disk = (string) config('filesystems.equipment_documents_disk');
            $path = $file->store("equipment/{$equipment->id}/generator-documents", $disk);

            $document = $equipment->generatorDocuments()->create([
                'uploaded_by_user_id' => $request->user()->id,
                'disk' => $disk,
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType() ?? 'application/pdf',
                'size_bytes' => $file->getSize(),
            ]);

            EquipmentChange::query()->create([
                'equipment_id' => $equipment->id,
                'actor_user_id' => $request->user()->id,
                'change_type' => EquipmentChangeType::GeneratorDocumentAdded,
                'source' => EquipmentChangeSource::Manual,
                'new_values' => [
                    'generator_document_id' => $document->id,
                    'original_name' => $document->original_name,
                ],
                'occurred_at' => now(),
            ]);

            return $document->setRelation('uploader', $request->user());
        });

        return response()->json([
            'data' => $documents->map(fn (EquipmentGeneratorDocument $document) => $this->serialize($equipment, $document)),
        ], 201);
    }

    public function show(Request $request, Equipment $equipment, EquipmentGeneratorDocument $generatorDocument): StreamedResponse
    {
        Gate::authorize('view', $equipment);
        abort_unless($generatorDocument->equipment_id === $equipment->id, 404);

        $headers = [
            'Content-Type' => 'application/pdf',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ];

        if ($request->boolean('preview')) {
            return Storage::disk($generatorDocument->disk)->response($generatorDocument->path, $generatorDocument->original_name, $headers, 'inline');
        }

        return Storage::disk($generatorDocument->disk)->download($generatorDocument->path, $generatorDocument->original_name, $headers);
    }

    public function destroy(Equipment $equipment, EquipmentGeneratorDocument $generatorDocument): JsonResponse
    {
        Gate::authorize('update', $equipment);
        abort_unless($generatorDocument->equipment_id === $equipment->id, 404);

        $metadata = [
            'generator_document_id' => $generatorDocument->id,
            'original_name' => $generatorDocument->original_name,
        ];
        Storage::disk($generatorDocument->disk)->delete($generatorDocument->path);
        $generatorDocument->delete();

        EquipmentChange::query()->create([
            'equipment_id' => $equipment->id,
            'actor_user_id' => auth()->id(),
            'change_type' => EquipmentChangeType::GeneratorDocumentDeleted,
            'source' => EquipmentChangeSource::Manual,
            'new_values' => $metadata,
            'occurred_at' => now(),
        ]);

        return response()->json(status: 204);
    }

    /** @return array<string, mixed> */
    private function serialize(Equipment $equipment, EquipmentGeneratorDocument $document): array
    {
        return [
            'id' => $document->id,
            'url' => route('equipment.generator-documents.show', [$equipment, $document], false),
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
