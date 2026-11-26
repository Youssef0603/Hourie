<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PurchaseOrders\StorePurchaseOrderInvoiceRequest;
use App\Http\Resources\PurchaseOrderResource;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderInvoice;
use App\Support\UploadedFileStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Supplier invoices received against a purchase order. The purchase order
 * resource compares them with the ordered total and the delivery notes.
 */
class PurchaseOrderInvoiceController extends Controller
{
    public function store(StorePurchaseOrderInvoiceRequest $request, PurchaseOrder $purchaseOrder): JsonResponse
    {
        $file = $request->file('invoice_file');
        $disk = (string) config('filesystems.equipment_documents_disk');

        $purchaseOrder->invoices()->create([
            ...$request->safe()->only(['invoice_number', 'invoiced_on', 'amount']),
            'uploaded_by_user_id' => $request->user()->id,
            'disk' => $disk,
            'path' => UploadedFileStorage::store($file, "purchase-orders/{$purchaseOrder->id}/invoices", $disk),
            'original_name' => $file->getClientOriginalName(),
            'mime_type' => $file->getMimeType() ?? 'application/pdf',
            'size_bytes' => $file->getSize(),
        ]);

        return (new PurchaseOrderResource($this->load($purchaseOrder)))->response()->setStatusCode(201);
    }

    public function show(Request $request, PurchaseOrder $purchaseOrder, PurchaseOrderInvoice $invoice): StreamedResponse
    {
        abort_unless($invoice->purchase_order_id === $purchaseOrder->id, 404);
        $headers = ['Content-Type' => 'application/pdf', 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff'];

        return $request->boolean('preview')
            ? Storage::disk($invoice->disk)->response($invoice->path, $invoice->original_name, $headers, 'inline')
            : Storage::disk($invoice->disk)->download($invoice->path, $invoice->original_name, $headers);
    }

    public function destroy(Request $request, PurchaseOrder $purchaseOrder, PurchaseOrderInvoice $invoice): JsonResponse
    {
        abort_unless($request->user()?->role->canManagePurchaseOrders(), 403);
        abort_unless($invoice->purchase_order_id === $purchaseOrder->id, 404);
        Storage::disk($invoice->disk)->delete($invoice->path);
        $invoice->delete();

        return (new PurchaseOrderResource($this->load($purchaseOrder->fresh())))->response();
    }

    private function load(PurchaseOrder $purchaseOrder): PurchaseOrder
    {
        return $purchaseOrder->load(['items.subcontractMaterial.item:id,code,description', 'creator:id,name', 'deliveryNotes.uploader:id,name', 'invoices.uploader:id,name']);
    }
}
