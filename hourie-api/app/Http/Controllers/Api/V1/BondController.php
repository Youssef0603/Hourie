<?php

namespace App\Http\Controllers\Api\V1;

use App\Actions\Bonds\SendBondExpiryReminders;
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
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Bond::query()
            ->with(['project:id,name', 'location:id,project_id,name'])
            ->latest('expires_on')
            ->latest('id');
        if ($request->filled('bond_type')) {
            $query->where('bond_type', $request->string('bond_type')->toString());
        }
        if ($request->filled('project_id')) {
            $query->where('project_id', $request->integer('project_id'));
        }
        if ($request->filled('search')) {
            $term = '%'.$request->string('search')->toString().'%';
            $query->where(fn ($builder) => $builder->where('issuer', 'like', $term)
                ->orWhereHas('project', fn ($project) => $project->where('name', 'like', $term))
                ->orWhereHas('location', fn ($location) => $location->where('name', 'like', $term)));
        }
        if ($request->filled('status')) {
            $today = now()->startOfDay();
            $query->when($request->string('status')->toString() === 'expired', fn ($builder) => $builder->whereDate('expires_on', '<', $today))
                ->when($request->string('status')->toString() === 'soon', fn ($builder) => $builder->whereBetween('expires_on', [$today, $today->copy()->addDays(30)]))
                ->when($request->string('status')->toString() === 'active', fn ($builder) => $builder->where(fn ($active) => $active->whereNull('expires_on')->orWhereDate('expires_on', '>', $today->copy()->addDays(30))));
        }

        $perPage = max(1, min(100, $request->integer('per_page', 10)));

        return BondResource::collection($query->paginate($perPage));
    }

    public function store(StoreBondRequest $request): JsonResponse
    {
        $bond = DB::transaction(function () use ($request): Bond {
            $bond = Bond::query()->create([...$request->validated(), 'created_by_user_id' => $request->user()->id]);
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
            $bond->update($request->validated());
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

    public function sendExpiryReminder(Request $request, Bond $bond, SendBondExpiryReminders $reminders): JsonResponse
    {
        abort_unless($request->user()?->role->canManageSites(), 403);

        return response()->json([
            'data' => [
                'queued' => $reminders->sendForBond($bond, withinThirtyDays: true),
            ],
        ]);
    }

    public function destroy(Request $request, Bond $bond): Response
    {
        abort_unless($request->user()?->role->canManageSites(), 403);
        $bond->load('documents');
        $documents = $bond->documents;
        $bond->delete();
        foreach ($documents as $document) {
            if (! $document->bonds()->exists()) {
                Storage::disk($document->disk)->delete($document->path);
                $document->delete();
            }
        }

        return response()->noContent();
    }

    public function storeDocuments(StoreBondDocumentsRequest $request, Bond $bond): JsonResponse
    {
        $disk = (string) config('filesystems.equipment_documents_disk');
        $documents = collect($request->file('documents', []))->map(function ($file) use ($bond, $request, $disk): BondDocument {
            $path = $file->store("bonds/{$bond->id}/documents", $disk);

            $document = BondDocument::query()->create([
                'uploaded_by_user_id' => $request->user()->id,
                'disk' => $disk,
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType() ?? 'application/pdf',
                'size_bytes' => $file->getSize(),
            ]);
            $bond->documents()->attach($document);

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
        abort_unless($bond->documents()->whereKey($document->id)->exists(), 404);

        return Storage::disk($document->disk)->response($document->path, $document->original_name, [
            'Content-Type' => $document->mime_type,
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ], 'inline');
    }

    public function destroyDocument(Request $request, Bond $bond, BondDocument $document): Response
    {
        abort_unless($request->user()?->role->canManageSites(), 403);
        abort_unless($bond->documents()->whereKey($document->id)->exists(), 404);
        $bond->changes()->create([
            'actor_user_id' => $request->user()->id,
            'action' => 'document_deleted',
            'previous_values' => ['document_id' => $document->id, 'name' => $document->original_name],
            'new_values' => [],
            'occurred_at' => now(),
        ]);
        $bond->documents()->detach($document);
        if (! $document->bonds()->exists()) {
            Storage::disk($document->disk)->delete($document->path);
            $document->delete();
        }

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

    /** @return array<string, mixed> */
    private function auditValues(Bond $bond): array
    {
        return $bond->only([
            'project_id', 'location_id', 'bond_type', 'issuer', 'amount', 'currency',
            'issued_on', 'expires_on', 'notes',
        ]);
    }
}
