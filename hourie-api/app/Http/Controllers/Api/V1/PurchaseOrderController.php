<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\PurchaseOrders\StorePurchaseOrderRequest;
use App\Http\Requests\PurchaseOrders\UpdatePurchaseOrderRequest;
use App\Http\Resources\PurchaseOrderResource;
use App\Models\Project;
use App\Models\PurchaseOrder;
use App\Models\SubcontractItemMaterial;
use App\Services\PurchaseOrderNumberGenerator;
use App\Services\PurchaseOrderPdfService;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PurchaseOrderController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = PurchaseOrder::query()
            ->with(['items.subcontractMaterial.item:id,code,description', 'creator:id,name', 'deliveryNotes.uploader:id,name', 'invoices.uploader:id,name'])
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

    public function store(StorePurchaseOrderRequest $request, PurchaseOrderPdfService $pdfService, PurchaseOrderNumberGenerator $numberGenerator): JsonResponse
    {
        $purchaseOrder = DB::transaction(function () use ($request, $numberGenerator): PurchaseOrder {
            $validated = $request->validated();
            $items = $validated['items'];
            unset($validated['items']);
            $project = Project::query()->findOrFail($validated['project_id']);

            $purchaseOrder = PurchaseOrder::query()->create([
                ...$validated,
                'number' => $numberGenerator->next($project, CarbonImmutable::parse($validated['ordered_on'])),
                'project_name' => $project->name,
                'created_by_user_id' => $request->user()->id,
            ]);
            $purchaseOrder->items()->createMany($this->numberedItems($items, $project));

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

            // The number is fixed at creation: it has already been sent to the supplier.
            $purchaseOrder->update([
                ...$validated,
                'project_name' => Project::query()->whereKey($validated['project_id'])->value('name'),
            ]);
            $purchaseOrder->items()->delete();
            $purchaseOrder->items()->createMany($this->numberedItems($items, Project::query()->findOrFail($validated['project_id'])));
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
        $purchaseOrder->invoices->each(fn ($invoice) => Storage::disk($invoice->disk)->delete($invoice->path));
        $purchaseOrder->delete();

        return response()->noContent();
    }

    private function authorizeAccess(Request $request): void
    {
        abort_unless($request->user()?->role->canManagePurchaseOrders(), 403);
    }

    /**
     * Numbers the lines and, for lines bought for a work item, takes the budget
     * code from that work item. A line can only point to a material of the
     * purchase order's own site.
     *
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     */
    private function numberedItems(array $items, Project $project): array
    {
        $materialIds = collect($items)->pluck('subcontract_item_material_id')->filter()->unique();
        $materials = SubcontractItemMaterial::query()
            ->with('item:id,subcontract_id,code', 'item.subcontract:id,project_id')
            ->whereKey($materialIds)
            ->get()
            ->keyBy('id');

        return collect($items)
            ->values()
            ->map(function (array $item, int $index) use ($materials, $project): array {
                $material = isset($item['subcontract_item_material_id']) ? $materials->get($item['subcontract_item_material_id']) : null;

                if ($material && $material->item->subcontract->project_id !== $project->id) {
                    throw ValidationException::withMessages([
                        "items.{$index}.subcontract_item_material_id" => [__('validation.purchase_order_material_other_site')],
                    ]);
                }

                return [
                    ...$item,
                    'position' => $index + 1,
                    'subcontract_item_material_id' => $material?->id,
                    'budget_code' => $material ? $material->item->code : ($item['budget_code'] ?? null),
                    'unit' => $material ? $material->unit : ($item['unit'] ?? null),
                ];
            })
            ->all();
    }

    private function loadPurchaseOrder(PurchaseOrder $purchaseOrder): PurchaseOrder
    {
        return $purchaseOrder->load(['items.subcontractMaterial.item:id,code,description', 'creator:id,name', 'deliveryNotes.uploader:id,name', 'invoices.uploader:id,name']);
    }
}
