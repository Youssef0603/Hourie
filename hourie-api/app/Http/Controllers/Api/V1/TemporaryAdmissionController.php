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
            ->get(['id', 'asset_code', 'brand', 'model', 'asset_details'])
            ->map(fn (Equipment $item) => [
                'id' => $item->id,
                'asset_code' => $item->asset_code,
                'name' => trim(implode(' ', array_filter([$item->brand, $item->model]))) ?: $item->asset_code,
                'chassis_number' => $item->asset_details['chassis_number'] ?? null,
            ]);

        return response()->json(['data' => $equipment]);
    }

    public function index()
    {
        return TemporaryAdmissionResource::collection(TemporaryAdmission::query()->with(['equipment', 'documents'])->latest('entered_on')->get());
    }

    public function store(StoreTemporaryAdmissionRequest $request)
    {
        $item = DB::transaction(function () use ($request) {
            $item = TemporaryAdmission::query()->create([...$request->safe()->except('equipment_ids'), 'created_by_user_id' => $request->user()->id]);
            $item->equipment()->sync($request->validated('equipment_ids'));

            return $item;
        });

        return (new TemporaryAdmissionResource($item->load(['equipment', 'documents'])))->response()->setStatusCode(201);
    }

    public function show(TemporaryAdmission $temporaryAdmission)
    {
        return new TemporaryAdmissionResource($temporaryAdmission->load(['equipment', 'documents']));
    }

    public function update(UpdateTemporaryAdmissionRequest $request, TemporaryAdmission $temporaryAdmission)
    {
        DB::transaction(function () use ($request, $temporaryAdmission) {
            $temporaryAdmission->update($request->safe()->except('equipment_ids'));
            $temporaryAdmission->equipment()->sync($request->validated('equipment_ids'));
        });

        return new TemporaryAdmissionResource($temporaryAdmission->fresh()->load(['equipment', 'documents']));
    }

    public function return(Request $request, TemporaryAdmission $temporaryAdmission)
    {
        abort_unless($request->user()?->role->canManageEquipment(), 403);
        $request->validate(['returned_on' => ['required', 'date', 'after_or_equal:'.$temporaryAdmission->entered_on->format('Y-m-d')], 'closure_reason' => ['nullable', 'string', 'max:500']]);
        $temporaryAdmission->update(['status' => 'returned', 'returned_on' => $request->input('returned_on'), 'closure_reason' => $request->input('closure_reason')]);

        return new TemporaryAdmissionResource($temporaryAdmission->fresh()->load(['equipment', 'documents']));
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

        return new TemporaryAdmissionResource($temporaryAdmission->fresh()->load(['equipment', 'documents']));
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

        return response()->json(['data' => (new TemporaryAdmissionResource($temporaryAdmission->fresh()->load(['equipment', 'documents'])))->resolve()], 201);
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
}
