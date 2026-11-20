<?php

namespace App\Services;

use App\Models\PurchaseOrderItem;
use App\Models\Subcontract;
use App\Models\SubcontractItem;
use App\Models\SubcontractItemMaterial;
use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;

/**
 * Compares, for every material ARH supplies, what the executed work should
 * have consumed with what ARH actually bought on purchase orders:
 *
 *   needed  = executed quantity × quantity per unit × (1 + waste %)
 *   bought  = Σ purchase order lines linked to the material
 *   gap     = bought − needed   (positive: surplus to justify, e.g. stock on site)
 */
class SubcontractMaterialCheck
{
    /**
     * @return array<int, array<string, mixed>>
     */
    public function forSubcontract(Subcontract $subcontract): array
    {
        $lastCertified = $subcontract->lastCertifiedValuation();
        $executed = $lastCertified?->lines()->pluck('cumulative_quantity', 'subcontract_item_id') ?? collect();

        $subcontract->loadMissing('items.materials.purchaseOrderItems.purchaseOrder:id,number,supplier_name,ordered_on');

        return $subcontract->items
            ->filter(fn (SubcontractItem $item) => $item->materials_supplied_by === SubcontractItem::SUPPLIED_BY_ARH && $item->materials->isNotEmpty())
            ->map(fn (SubcontractItem $item) => [
                'item_id' => $item->id,
                'code' => $item->code,
                'description' => $item->description,
                'unit' => $item->unit,
                'executed_quantity' => (string) BigDecimal::of((string) ($executed[$item->id] ?? '0'))->toScale(3),
                'materials' => $item->materials->map(
                    fn (SubcontractItemMaterial $material) => $this->checkMaterial($material, BigDecimal::of((string) ($executed[$item->id] ?? '0'))),
                )->values(),
            ])
            ->values()
            ->all();
    }

    /**
     * Every purchase order that bought material for this subcontract, once each.
     *
     * @return array<int, array<string, mixed>>
     */
    public function purchaseOrders(Subcontract $subcontract): array
    {
        $subcontract->loadMissing('items.materials.purchaseOrderItems.purchaseOrder:id,number,supplier_name,ordered_on');

        return $subcontract->items
            ->flatMap(fn (SubcontractItem $item) => $item->materials)
            ->flatMap(fn (SubcontractItemMaterial $material) => $material->purchaseOrderItems)
            ->map(fn (PurchaseOrderItem $line) => $line->purchaseOrder)
            ->filter()
            ->unique('id')
            ->sortBy([['ordered_on', 'desc'], ['id', 'desc']])
            ->map(fn ($order) => [
                'id' => $order->id,
                'number' => $order->number,
                'supplier_name' => $order->supplier_name,
                'ordered_on' => $order->ordered_on?->format('Y-m-d'),
                'pdf_url' => route('purchase-orders.pdf', $order, false),
            ])
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>
     */
    private function checkMaterial(SubcontractItemMaterial $material, BigDecimal $executed): array
    {
        $theoretical = $executed->multipliedBy((string) $material->quantity_per_unit);
        $needed = $theoretical->multipliedBy(BigDecimal::of('100')->plus((string) $material->waste_percent))->dividedBy(100, 3, RoundingMode::HalfUp);

        $lines = $material->purchaseOrderItems;
        $bought = $lines->reduce(fn (BigDecimal $total, PurchaseOrderItem $line) => $total->plus((string) $line->quantity), BigDecimal::zero());
        $spent = $lines->reduce(fn (BigDecimal $total, PurchaseOrderItem $line) => $total->plus($line->subtotal()), BigDecimal::zero());
        $averagePrice = $bought->isZero() ? BigDecimal::zero() : $spent->dividedBy($bought, 2, RoundingMode::HalfUp);
        $gap = $bought->minus($needed);

        $status = match (true) {
            $gap->isGreaterThan(0) => 'surplus',
            $bought->isLessThan($theoretical) => 'shortfall',
            default => 'ok',
        };

        return [
            'id' => $material->id,
            'name' => $material->name,
            'unit' => $material->unit,
            'quantity_per_unit' => $material->quantity_per_unit,
            'waste_percent' => $material->waste_percent,
            'theoretical_quantity' => (string) $theoretical->toScale(3, RoundingMode::HalfUp),
            'needed_quantity' => (string) $needed,
            'bought_quantity' => (string) $bought->toScale(3),
            'bought_amount' => (string) $spent->toScale(2, RoundingMode::HalfUp),
            'gap_quantity' => (string) $gap->toScale(3, RoundingMode::HalfUp),
            'gap_amount' => (string) $gap->multipliedBy($averagePrice)->toScale(2, RoundingMode::HalfUp),
            'status' => $status,
            'purchase_orders' => $lines->groupBy('purchase_order_id')->map(fn ($orderLines) => [
                'id' => $orderLines->first()->purchase_order_id,
                'number' => $orderLines->first()->purchaseOrder?->number,
                'pdf_url' => route('purchase-orders.pdf', $orderLines->first()->purchase_order_id, false),
                'quantity' => (string) $orderLines->reduce(fn (BigDecimal $total, PurchaseOrderItem $line) => $total->plus((string) $line->quantity), BigDecimal::zero()),
            ])->values(),
        ];
    }
}
