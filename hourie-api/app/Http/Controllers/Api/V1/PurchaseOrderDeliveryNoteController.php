<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PurchaseOrders\StorePurchaseOrderDeliveryNotesRequest;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderDeliveryNote;
use App\Support\UploadedFileStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PurchaseOrderDeliveryNoteController extends Controller
{
    public function store(StorePurchaseOrderDeliveryNotesRequest $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $documents = collect($request->file('delivery_notes', []))->map(function ($file) use ($purchaseOrder, $request): PurchaseOrderDeliveryNote {
            $disk = (string) config('filesystems.equipment_documents_disk');
            $path = UploadedFileStorage::store($file, "purchase-orders/{$purchaseOrder->id}/delivery-notes", $disk);

            return $purchaseOrder->deliveryNotes()->create([
                'uploaded_by_user_id' => $request->user()->id,
                'disk' => $disk,
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType() ?? 'application/pdf',
                'size_bytes' => $file->getSize(),
            ])->load('uploader:id,name');
        });

        return response()->json([
            'data' => $documents->map(fn (PurchaseOrderDeliveryNote $document): array => $this->serialize($purchaseOrder, $document)),
        ], 201);
    }

    public function show(Request $request, PurchaseOrder $purchaseOrder, PurchaseOrderDeliveryNote $deliveryNote): StreamedResponse
    {
        abort_unless($deliveryNote->purchase_order_id === $purchaseOrder->id, 404);

        $headers = [
            'Content-Type' => 'application/pdf',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ];

        if ($request->boolean('preview')) {
            return Storage::disk($deliveryNote->disk)->response($deliveryNote->path, $deliveryNote->original_name, $headers, 'inline');
        }

        return Storage::disk($deliveryNote->disk)->download($deliveryNote->path, $deliveryNote->original_name, $headers);
    }

    public function destroy(Request $request, PurchaseOrder $purchaseOrder, PurchaseOrderDeliveryNote $deliveryNote): JsonResponse
    {
        abort_unless($request->user()?->role->canManagePurchaseOrders(), 403);
        abort_unless($deliveryNote->purchase_order_id === $purchaseOrder->id, 404);

        Storage::disk($deliveryNote->disk)->delete($deliveryNote->path);
        $deliveryNote->delete();

        return response()->json(status: 204);
    }

    private function serialize(PurchaseOrder $purchaseOrder, PurchaseOrderDeliveryNote $document): array
    {
        return [
            'id' => $document->id,
            'url' => route('purchase-orders.delivery-notes.show', [$purchaseOrder, $document], false),
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
