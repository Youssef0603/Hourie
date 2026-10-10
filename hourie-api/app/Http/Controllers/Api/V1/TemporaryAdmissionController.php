<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\TemporaryAdmissions\StoreTemporaryAdmissionRequest;
use App\Http\Requests\TemporaryAdmissions\UpdateTemporaryAdmissionRequest;
use App\Http\Resources\TemporaryAdmissionResource;
use App\Models\Equipment;
use App\Models\TemporaryAdmission;
use App\Models\TemporaryAdmissionDocument;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TemporaryAdmissionController extends Controller
{
    public function equipmentOptions(Request $request): JsonResponse
    {
        abort_unless($request->user()?->can('viewAny', Equipment::class), 403);

        $equipment = Equipment::query()
            ->where('is_active', true)
            ->orderBy('brand')
            ->orderBy('model')
            ->orderBy('asset_code')
            ->get(['id', 'asset_code', 'brand', 'model', 'serial_number', 'asset_details'])
            ->map(fn (Equipment $item) => [
                'id' => $item->id,
                'asset_code' => $item->asset_code,
                'name' => trim(implode(' ', array_filter([$item->brand, $item->model]))) ?: $item->asset_code,
                'serial_number' => $item->serial_number,
                'chassis_number' => $item->asset_details['chassis_number'] ?? null,
            ]);

        return response()->json(['data' => $equipment]);
    }

    public function index(Request $request)
    {
        $perPage = max(1, min(100, $request->integer('per_page', 10)));

        return TemporaryAdmissionResource::collection(
            TemporaryAdmission::query()
                ->withCount(['documents', 'documents as renewal_documents_count' => fn ($query) => $query->where('document_type', 'renewal')])
                ->when($request->filled('search'), fn ($query) => $query->where('customs_reference', 'like', '%'.$request->string('search')->toString().'%'))
                ->latest('entered_on')
                ->latest('id')
                ->paginate($perPage),
        );
    }

    public function store(StoreTemporaryAdmissionRequest $request)
    {
        $item = DB::transaction(function () use ($request) {
            $item = TemporaryAdmission::query()->create([...$request->safe()->except('equipment_ids'), 'created_by_user_id' => $request->user()->id]);
            $item->equipment()->sync($request->validated('equipment_ids'));
            $item->changes()->create([
                'actor_user_id' => $request->user()->id,
                'action' => 'created',
                'new_values' => $this->auditValues($item, $request->validated('equipment_ids')),
                'occurred_at' => now(),
            ]);

            return $item;
        });

        return (new TemporaryAdmissionResource($item->load(['equipment', 'documents', 'changes.actor:id,name'])))->response()->setStatusCode(201);
    }

    public function show(TemporaryAdmission $temporaryAdmission)
    {
        return new TemporaryAdmissionResource($temporaryAdmission->load(['equipment', 'documents', 'changes.actor:id,name']));
    }

    public function update(UpdateTemporaryAdmissionRequest $request, TemporaryAdmission $temporaryAdmission)
    {
        DB::transaction(function () use ($request, $temporaryAdmission) {
            $previousValues = $this->auditValues($temporaryAdmission, $temporaryAdmission->equipment()->pluck('equipment.id')->all());
            $temporaryAdmission->update($request->safe()->except('equipment_ids'));
            $temporaryAdmission->equipment()->sync($request->validated('equipment_ids'));
            $temporaryAdmission->changes()->create([
                'actor_user_id' => $request->user()->id,
                'action' => 'updated',
                'previous_values' => $previousValues,
                'new_values' => $this->auditValues($temporaryAdmission, $request->validated('equipment_ids')),
                'occurred_at' => now(),
            ]);
        });

        return new TemporaryAdmissionResource($temporaryAdmission->fresh()->load(['equipment', 'documents', 'changes.actor:id,name']));
    }

    public function return(Request $request, TemporaryAdmission $temporaryAdmission)
    {
        abort_unless($request->user()?->role->canManageEquipment(), 403);
        $request->validate(['returned_on' => ['required', 'date', 'after_or_equal:'.$temporaryAdmission->entered_on->format('Y-m-d')], 'closure_reason' => ['nullable', 'string', 'max:500']]);
        $temporaryAdmission->update(['status' => 'returned', 'returned_on' => $request->input('returned_on'), 'closure_reason' => $request->input('closure_reason')]);
        $temporaryAdmission->changes()->create(['actor_user_id' => $request->user()->id, 'action' => 'returned', 'new_values' => ['returned_on' => $request->input('returned_on'), 'closure_reason' => $request->input('closure_reason')], 'occurred_at' => now()]);

        return new TemporaryAdmissionResource($temporaryAdmission->fresh()->load(['equipment', 'documents', 'changes.actor:id,name']));
    }

    public function clearCustoms(Request $request, TemporaryAdmission $temporaryAdmission)
    {
        abort_unless($request->user()?->role->canManageEquipment(), 403);
        if (in_array($temporaryAdmission->status, ['returned', 'cleared'], true)) {
            throw ValidationException::withMessages(['cleared_on' => ['Cette admission est déjà clôturée.']]);
        }
        $request->validate([
            'cleared_on' => ['required', 'date', 'after_or_equal:'.$temporaryAdmission->entered_on->format('Y-m-d')],
            'clearance_reference' => ['nullable', 'string', 'max:255'],
            'customs_duty_amount' => ['required', 'numeric', 'min:0'],
        ]);
        $temporaryAdmission->update([
            'status' => 'cleared',
            'cleared_on' => $request->input('cleared_on'),
            'clearance_reference' => $request->input('clearance_reference'),
            'customs_duty_amount' => $request->input('customs_duty_amount'),
        ]);
        $temporaryAdmission->changes()->create(['actor_user_id' => $request->user()->id, 'action' => 'customs_cleared', 'new_values' => ['cleared_on' => $request->input('cleared_on'), 'clearance_reference' => $request->input('clearance_reference'), 'customs_duty_amount' => $request->input('customs_duty_amount')], 'occurred_at' => now()]);

        return new TemporaryAdmissionResource($temporaryAdmission->fresh()->load(['equipment', 'documents', 'changes.actor:id,name']));
    }

    public function storeDocument(Request $request, TemporaryAdmission $temporaryAdmission)
    {
        abort_unless($request->user()?->role->canManageEquipment(), 403);
        $validated = $request->validate(['document' => ['required', 'file', 'mimes:pdf', 'max:10240'], 'document_type' => ['required', Rule::in(TemporaryAdmissionDocument::TYPES)], 'document_date' => ['nullable', 'date', 'required_if:document_type,renewal']]);
        if ($validated['document_type'] === 'renewal' && in_array($temporaryAdmission->status, ['returned', 'cleared'], true)) {
            throw ValidationException::withMessages(['document' => ['Une admission clôturée ne peut plus être renouvelée.']]);
        }
        if ($validated['document_type'] === 'initial' && $temporaryAdmission->documents()->where('document_type', 'initial')->exists()) {
            throw ValidationException::withMessages(['document' => ['Le document initial est déjà enregistré.']]);
        }
        if (($validated['document_type'] ?? null) === 'renewal' && CarbonImmutable::parse($validated['document_date'])->isBefore($temporaryAdmission->entered_on)) {
            throw ValidationException::withMessages(['document_date' => ['La date de renouvellement doit être postérieure à la date d’entrée.']]);
        }
        $file = $request->file('document');
        $disk = (string) config('filesystems.equipment_documents_disk');
        $path = $file->store("temporary-admissions/{$temporaryAdmission->id}", $disk);
        $document = $temporaryAdmission->documents()->create(['uploaded_by_user_id' => $request->user()->id, 'document_type' => $validated['document_type'], 'document_date' => $validated['document_date'] ?? null, 'disk' => $disk, 'path' => $path, 'original_name' => $file->getClientOriginalName(), 'mime_type' => $file->getMimeType() ?? 'application/pdf', 'size_bytes' => $file->getSize()]);
        if ($document->document_type === 'renewal') {
            $temporaryAdmission->update(['status' => 'renewed']);
        }
        $temporaryAdmission->changes()->create(['actor_user_id' => $request->user()->id, 'action' => $document->document_type === 'renewal' ? 'renewed' : 'document_added', 'new_values' => ['document_id' => $document->id, 'document_type' => $document->document_type, 'name' => $document->original_name, 'document_date' => $document->document_date?->format('Y-m-d')], 'occurred_at' => now()]);

        return response()->json(['data' => (new TemporaryAdmissionResource($temporaryAdmission->fresh()->load(['equipment', 'documents', 'changes.actor:id,name'])))->resolve()], 201);
    }

    public function showDocument(TemporaryAdmission $temporaryAdmission, TemporaryAdmissionDocument $document)
    {
        abort_unless($document->temporary_admission_id === $temporaryAdmission->id, 404);

        return Storage::disk($document->disk)->response($document->path, $document->original_name, ['Content-Type' => $document->mime_type], 'inline');
    }

    public function destroyDocument(Request $request, TemporaryAdmission $temporaryAdmission, TemporaryAdmissionDocument $document)
    {
        abort_unless($request->user()?->role->canManageEquipment(), 403);
        abort_unless($document->temporary_admission_id === $temporaryAdmission->id, 404);
        $temporaryAdmission->changes()->create(['actor_user_id' => $request->user()->id, 'action' => 'document_deleted', 'previous_values' => ['document_id' => $document->id, 'document_type' => $document->document_type, 'name' => $document->original_name], 'new_values' => [], 'occurred_at' => now()]);
        Storage::disk($document->disk)->delete($document->path);
        $wasRenewal = $document->document_type === 'renewal';
        $document->delete();
        if ($wasRenewal && in_array($temporaryAdmission->status, ['active', 'renewed'], true) && ! $temporaryAdmission->documents()->where('document_type', 'renewal')->exists()) {
            $temporaryAdmission->update(['status' => 'active']);
        }

        return response()->noContent();
    }

    public function destroy(Request $request, TemporaryAdmission $temporaryAdmission)
    {
        abort_unless($request->user()?->role->canManageEquipment(), 403);
        $temporaryAdmission->load('documents');
        foreach ($temporaryAdmission->documents as $document) {
            Storage::disk($document->disk)->delete($document->path);
        }
        $temporaryAdmission->delete();

        return response()->noContent();
    }

    /** @param array<int, int|string> $equipmentIds */
    private function auditValues(TemporaryAdmission $temporaryAdmission, array $equipmentIds): array
    {
        return [
            'customs_reference' => $temporaryAdmission->customs_reference,
            'entered_on' => $temporaryAdmission->entered_on?->format('Y-m-d'),
            'status' => $temporaryAdmission->status,
            'notes' => $temporaryAdmission->notes,
            'equipment_ids' => array_map('intval', $equipmentIds),
        ];
    }
}
