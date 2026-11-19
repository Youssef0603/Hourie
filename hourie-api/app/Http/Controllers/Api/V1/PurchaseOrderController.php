<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PurchaseOrders\StorePurchaseOrderRequest;
use App\Http\Requests\PurchaseOrders\UpdatePurchaseOrderRequest;
use App\Http\Resources\PurchaseOrderResource;
use App\Models\PurchaseOrder;
use App\Services\PurchaseOrderPdfService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PurchaseOrderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = PurchaseOrder::query()
            ->with(['items', 'creator:id,name', 'deliveryNotes.uploader:id,name'])
            ->latest('ordered_on')
            ->latest('id');

        if ($request->filled('search')) {
            $search = '%'.$request->string('search')->trim()->toString().'%';
            $query->where(fn ($builder) => $builder
                ->where('supplier_name', 'like', $search)
                ->orWhere('project_name', 'like', $search)
                ->orWhere('number', 'like', $search));
        }

        return PurchaseOrderResource::collection($query->paginate(max(1, min(100, $request->integer('per_page', 20)))));
    }

    public function store(StorePurchaseOrderRequest $request, PurchaseOrderPdfService $pdfService): JsonResponse
    {
        $purchaseOrder = DB::transaction(function () use ($request): PurchaseOrder {
            $validated = $request->validated();
            $items = $validated['items'];
            unset($validated['items']);

            $purchaseOrder = PurchaseOrder::query()->create([
                ...$validated,
                'created_by_user_id' => $request->user()->id,
            ]);
            $purchaseOrder->update([
                'number' => (int) config('purchase-orders.number_offset') + $purchaseOrder->id,
            ]);
            $purchaseOrder->items()->createMany($this->numberedItems($items));

            return $purchaseOrder;
        });

        $purchaseOrder = $pdfService->generateAndStore($purchaseOrder);

        return (new PurchaseOrderResource($purchaseOrder))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, PurchaseOrder $purchaseOrder): PurchaseOrderResource
    {
        return new PurchaseOrderResource($this->loadPurchaseOrder($purchaseOrder));
    }

    public function update(UpdatePurchaseOrderRequest $request, PurchaseOrder $purchaseOrder, PurchaseOrderPdfService $pdfService): PurchaseOrderResource
    {
        DB::transaction(function () use ($request, $purchaseOrder): void {
            $validated = $request->validated();
            $items = $validated['items'];
            unset($validated['items']);

            $purchaseOrder->update($validated);
            $purchaseOrder->items()->delete();
            $purchaseOrder->items()->createMany($this->numberedItems($items));
        });

        return new PurchaseOrderResource($pdfService->generateAndStore($purchaseOrder->fresh()));
    }

    public function pdf(Request $request, PurchaseOrder $purchaseOrder, PurchaseOrderPdfService $pdfService): StreamedResponse
    {
        if (! $purchaseOrder->pdf_disk || ! $purchaseOrder->pdf_path || ! Storage::disk($purchaseOrder->pdf_disk)->exists($purchaseOrder->pdf_path)) {
            $purchaseOrder = $pdfService->generateAndStore($purchaseOrder);
        }

        $headers = [
            'Content-Type' => 'application/pdf',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ];
        $filename = $pdfService->filename($purchaseOrder);

        if ($request->boolean('preview')) {
            return Storage::disk($purchaseOrder->pdf_disk)->response($purchaseOrder->pdf_path, $filename, $headers, 'inline');
        }

        return Storage::disk($purchaseOrder->pdf_disk)->download($purchaseOrder->pdf_path, $filename, $headers);
    }

    public function destroy(Request $request, PurchaseOrder $purchaseOrder): Response
    {
        $this->authorizeAccess($request);
        if ($purchaseOrder->pdf_disk && $purchaseOrder->pdf_path) {
            Storage::disk($purchaseOrder->pdf_disk)->delete($purchaseOrder->pdf_path);
        }
        $purchaseOrder->deliveryNotes->each(fn ($document) => Storage::disk($document->disk)->delete($document->path));
        $purchaseOrder->delete();

        return response()->noContent();
    }

    private function authorizeAccess(Request $request): void
    {
        abort_unless($request->user()?->role->canManagePurchaseOrders(), 403);
    }

    /** @param array<int, array<string, mixed>> $items */
    private function numberedItems(array $items): array
    {
        return collect($items)
            ->values()
            ->map(fn (array $item, int $index): array => [...$item, 'position' => $index + 1])
            ->all();
    }

    private function loadPurchaseOrder(PurchaseOrder $purchaseOrder): PurchaseOrder
    {
        return $purchaseOrder->load(['items', 'creator:id,name', 'deliveryNotes.uploader:id,name']);
    }
}
