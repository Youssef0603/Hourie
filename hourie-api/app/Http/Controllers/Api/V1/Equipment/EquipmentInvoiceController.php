<?php

namespace App\Http\Controllers\Api\V1\Equipment;

use App\Enums\EquipmentChangeSource;
use App\Enums\EquipmentChangeType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Equipment\StoreEquipmentInvoicesRequest;
use App\Models\Equipment;
use App\Models\EquipmentChange;
use App\Models\EquipmentInvoice;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class EquipmentInvoiceController extends Controller
{
    public function store(StoreEquipmentInvoicesRequest $request, Equipment $equipment): JsonResponse
    {
        $invoices = collect($request->file('invoices', []))->map(function ($file) use ($equipment, $request): EquipmentInvoice {
            $disk = (string) config('filesystems.equipment_documents_disk');
            $path = $file->store("equipment/{$equipment->id}/invoices", $disk);

            $invoice = $equipment->invoices()->create([
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
                'change_type' => EquipmentChangeType::InvoiceAdded,
                'source' => EquipmentChangeSource::Manual,
                'new_values' => ['invoice_id' => $invoice->id, 'original_name' => $invoice->original_name],
                'occurred_at' => now(),
            ]);

            return $invoice->setRelation('uploader', $request->user());
        });

        return response()->json([
            'data' => $invoices->map(fn (EquipmentInvoice $invoice) => $this->serialize($equipment, $invoice)),
        ], 201);
    }

    public function show(Equipment $equipment, EquipmentInvoice $invoice): StreamedResponse
    {
        Gate::authorize('view', $equipment);
        abort_unless($invoice->equipment_id === $equipment->id, 404);

        return Storage::disk($invoice->disk)->download($invoice->path, $invoice->original_name, [
            'Content-Type' => 'application/pdf',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function destroy(Equipment $equipment, EquipmentInvoice $invoice): JsonResponse
    {
        Gate::authorize('update', $equipment);
        abort_unless($invoice->equipment_id === $equipment->id, 404);

        $metadata = ['invoice_id' => $invoice->id, 'original_name' => $invoice->original_name];
        Storage::disk($invoice->disk)->delete($invoice->path);
        $invoice->delete();

        EquipmentChange::query()->create([
            'equipment_id' => $equipment->id,
            'actor_user_id' => auth()->id(),
            'change_type' => EquipmentChangeType::InvoiceDeleted,
            'source' => EquipmentChangeSource::Manual,
            'new_values' => $metadata,
            'occurred_at' => now(),
        ]);

        return response()->json(status: 204);
    }

    /** @return array<string, mixed> */
    private function serialize(Equipment $equipment, EquipmentInvoice $invoice): array
    {
        return [
            'id' => $invoice->id,
            'url' => route('equipment.invoices.show', [$equipment, $invoice], false),
            'original_name' => $invoice->original_name,
            'mime_type' => $invoice->mime_type,
            'size_bytes' => $invoice->size_bytes,
            'uploaded_by' => $invoice->uploader === null ? null : [
                'id' => $invoice->uploader->id,
                'name' => $invoice->uploader->name,
            ],
            'created_at' => $invoice->created_at->toISOString(),
        ];
    }
}
