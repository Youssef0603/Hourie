<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Bonds\StoreBondDocumentsRequest;
use App\Http\Requests\Bonds\StoreBondRequest;
use App\Http\Requests\Bonds\UpdateBondRequest;
use App\Http\Resources\BondResource;
use App\Models\Bond;
use App\Models\BondDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class BondController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return BondResource::collection(Bond::query()->with(['project:id,name', 'location:id,project_id,name', 'documents'])->latest('expires_on')->latest('id')->get());
    }

    public function store(StoreBondRequest $request): JsonResponse
    {
        $bond = DB::transaction(function () use ($request): Bond {
            $bond = Bond::query()->create([...$this->withTotal($request->validated()), 'created_by_user_id' => $request->user()->id]);
            $bond->changes()->create([
                'actor_user_id' => $request->user()->id,
                'action' => 'created',
                'new_values' => $this->auditValues($bond),
                'occurred_at' => now(),
            ]);

            return $bond;
        });

        return (new BondResource($bond->load(['project:id,name', 'location:id,project_id,name', 'documents', 'changes.actor:id,name'])))->response()->setStatusCode(201);
    }

    public function show(Bond $bond): BondResource
    {
        return new BondResource($bond->load(['project:id,name', 'location:id,project_id,name', 'documents', 'changes.actor:id,name']));
    }

    public function update(UpdateBondRequest $request, Bond $bond): BondResource
    {
        DB::transaction(function () use ($request, $bond): void {
            $previousValues = $this->auditValues($bond);
            $bond->update($this->withTotal($request->validated()));
            $bond->changes()->create([
                'actor_user_id' => $request->user()->id,
                'action' => 'updated',
                'previous_values' => $previousValues,
                'new_values' => $this->auditValues($bond),
                'occurred_at' => now(),
            ]);
        });

        return new BondResource($bond->fresh()->load(['project:id,name', 'location:id,project_id,name', 'documents', 'changes.actor:id,name']));
    }

    public function destroy(Request $request, Bond $bond): Response
    {
        abort_unless($request->user()?->role->canManageSites(), 403);
        $bond->load('documents');
        foreach ($bond->documents as $document) {
            Storage::disk($document->disk)->delete($document->path);
        }
        $bond->delete();

        return response()->noContent();
    }

    public function storeDocuments(StoreBondDocumentsRequest $request, Bond $bond): JsonResponse
    {
        $disk = (string) config('filesystems.equipment_documents_disk');
        $documents = collect($request->file('documents', []))->map(function ($file) use ($bond, $request, $disk): BondDocument {
            $path = $file->store("bonds/{$bond->id}/documents", $disk);

            $document = $bond->documents()->create([
                'uploaded_by_user_id' => $request->user()->id,
                'disk' => $disk,
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType() ?? 'application/pdf',
                'size_bytes' => $file->getSize(),
            ]);

            $bond->changes()->create([
                'actor_user_id' => $request->user()->id,
                'action' => 'document_added',
                'new_values' => ['document_id' => $document->id, 'name' => $document->original_name],
                'occurred_at' => now(),
            ]);

            return $document;
        });

        return response()->json(['data' => $documents->map(fn (BondDocument $document) => $this->documentData($bond, $document))], 201);
    }

    public function showDocument(Bond $bond, BondDocument $document): StreamedResponse
    {
        abort_unless($document->bond_id === $bond->id, 404);

        return Storage::disk($document->disk)->response($document->path, $document->original_name, [
            'Content-Type' => $document->mime_type,
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ], 'inline');
    }

    public function destroyDocument(Request $request, Bond $bond, BondDocument $document): Response
    {
        abort_unless($request->user()?->role->canManageSites(), 403);
        abort_unless($document->bond_id === $bond->id, 404);
        $bond->changes()->create([
            'actor_user_id' => $request->user()->id,
            'action' => 'document_deleted',
            'previous_values' => ['document_id' => $document->id, 'name' => $document->original_name],
            'new_values' => [],
            'occurred_at' => now(),
        ]);
        Storage::disk($document->disk)->delete($document->path);
        $document->delete();

        return response()->noContent();
    }

    private function documentData(Bond $bond, BondDocument $document): array
    {
        return [
            'id' => $document->id,
            'original_name' => $document->original_name,
            'mime_type' => $document->mime_type,
            'size_bytes' => $document->size_bytes,
            'url' => "/api/v1/bonds/{$bond->id}/documents/{$document->id}/file",
        ];
    }

    /** @param array<string, mixed> $data @return array<string, mixed> */
    private function withTotal(array $data): array
    {
        $data['advance_payment_amount'] = (float) ($data['advance_payment_amount'] ?? 0);
        $data['performance_amount'] = (float) ($data['performance_amount'] ?? 0);
        $data['retention_amount'] = (float) ($data['retention_amount'] ?? 0);
        $data['amount'] = $data['advance_payment_amount'] + $data['performance_amount'] + $data['retention_amount'];

        return $data;
    }

    /** @return array<string, mixed> */
    private function auditValues(Bond $bond): array
    {
        return $bond->only([
            'project_id', 'location_id', 'issuer', 'advance_payment_amount', 'performance_amount',
            'retention_amount', 'amount', 'currency', 'issued_on', 'expires_on', 'notes',
        ]);
    }
}
