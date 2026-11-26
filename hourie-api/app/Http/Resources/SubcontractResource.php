<?php

namespace App\Http\Resources;

use App\Models\Subcontract;
use App\Models\SubcontractItem;
use App\Models\SubcontractValuation;
use App\Services\SubcontractMaterialCheck;
use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Subcontract
 */
class SubcontractResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $items = $this->items;
        $valuations = $this->valuations;
        $lastCertified = $valuations->filter(fn (SubcontractValuation $valuation) => $valuation->isCertified() && ! $valuation->isAdvance())->last();
        $executedQuantities = $lastCertified?->lines->pluck('cumulative_quantity', 'subcontract_item_id') ?? collect();

        $original = $this->sum($items, fn (SubcontractItem $item) => BigDecimal::of((string) $item->quantity)->multipliedBy((string) $item->unit_price));
        $revised = $this->sum($items, fn (SubcontractItem $item) => $item->authorizedQuantity()->multipliedBy((string) $item->unit_price));
        $executed = BigDecimal::of((string) ($lastCertified?->works_cumulative ?? '0'));
        $paid = $this->sum($valuations, fn (SubcontractValuation $valuation) => $valuation->paidAmount());
        $toPay = $this->sum($valuations, fn (SubcontractValuation $valuation) => $valuation->balanceDue());
        $openValuation = $valuations->first(fn (SubcontractValuation $valuation) => ! $valuation->isCertified());
        $channels = collect($this->resource->channelTotals())->map(fn (array $amounts) => array_map(fn (BigDecimal $amount) => $this->money($amount), $amounts))->all();

        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'title' => $this->title,
            'status' => $this->status,
            'signed_on' => $this->signed_on?->format('Y-m-d'),
            'subcontractor' => $this->subcontractor->only(['id', 'name', 'contact_name', 'phone', 'email', 'tax_number']),
            'project' => $this->project->only(['id', 'code', 'name']),
            'vat_rate' => $this->vat_rate,
            'retention_rate' => $this->retention_rate,
            'advance_amount' => $this->advance_amount,
            'advance_recovery_rate' => $this->advance_recovery_rate,
            'employer_name' => $this->employer_name,
            'engineer_name' => $this->engineer_name,
            'cash_percent' => $this->cash_percent,
            'recurring_deduction_label' => $this->recurring_deduction_label,
            'recurring_deduction_amount' => $this->recurring_deduction_amount,
            'historical_works_amount' => $this->historical_works_amount,
            'currency' => $this->currency,
            'notes' => $this->notes,
            'summary' => [
                'original_amount' => $this->money($original),
                'variations_amount' => $this->money($revised->minus($original)),
                'revised_amount' => $this->money($revised),
                'executed_amount' => $this->money($executed),
                'progress_percent' => $revised->isZero() ? 0 : (float) (string) $executed->multipliedBy(100)->dividedBy($revised, 1, RoundingMode::HalfUp),
                'paid_amount' => $this->money($paid),
                'to_pay_amount' => $this->money($toPay),
                'retention_held' => (string) ($lastCertified?->retention_cumulative ?? '0.00'),
                'advance_remaining' => $this->money(BigDecimal::of((string) $this->advance_amount)->minus((string) ($lastCertified?->advance_recovery_cumulative ?? '0'))),
                'channels' => $channels,
                'has_work_valuations' => $valuations->contains(fn (SubcontractValuation $valuation) => ! $valuation->isAdvance()),
                'valuations_count' => $valuations->count(),
                'open_valuation' => $openValuation?->only(['id', 'reference', 'status']),
            ],
            'items' => $items->map(fn (SubcontractItem $item) => [
                'id' => $item->id,
                'position' => $item->position,
                'code' => $item->code,
                'description' => $item->description,
                'unit' => $item->unit,
                'quantity' => $item->quantity,
                'authorized_quantity' => (string) $item->authorizedQuantity()->toScale(3),
                'executed_quantity' => (string) BigDecimal::of((string) ($executedQuantities[$item->id] ?? '0'))->toScale(3),
                'unit_price' => $item->unit_price,
                'variation' => $item->variation_id ? $item->variation?->reference() : null,
                'materials_supplied_by' => $item->materials_supplied_by,
                'materials' => $item->relationLoaded('materials') ? $item->materials->map(fn ($material) => [
                    'id' => $material->id,
                    'name' => $material->name,
                    'unit' => $material->unit,
                    'quantity_per_unit' => $material->quantity_per_unit,
                    'waste_percent' => $material->waste_percent,
                ])->values() : [],
            ])->values(),
            'material_check' => $this->whenLoaded('variations', fn () => app(SubcontractMaterialCheck::class)->forSubcontract($this->resource)),
            'purchase_orders' => $this->whenLoaded('variations', fn () => app(SubcontractMaterialCheck::class)->purchaseOrders($this->resource)),
            'variations' => $this->whenLoaded('variations', fn () => $this->variations->map(fn ($variation) => [
                'id' => $variation->id,
                'reference' => $variation->reference(),
                'title' => $variation->title,
                'reason' => $variation->reason,
                'approved_on' => $variation->approved_on?->format('Y-m-d'),
                'amount' => $this->money($this->sum($variation->lines, fn ($line) => BigDecimal::of((string) $line->quantity)->multipliedBy((string) $line->item->unit_price))),
                'lines' => $variation->lines->map(fn ($line) => [
                    'subcontract_item_id' => $line->subcontract_item_id,
                    'description' => $line->item->description,
                    'unit' => $line->item->unit,
                    'quantity' => $line->quantity,
                ])->values(),
            ])->values()),
            'valuations' => $valuations->map(fn (SubcontractValuation $valuation) => [
                'id' => $valuation->id,
                'reference' => $valuation->reference,
                'kind' => $valuation->kind,
                'status' => $valuation->status,
                'valuation_date' => $valuation->valuation_date?->format('Y-m-d'),
                'period_end' => $valuation->period_end?->format('Y-m-d'),
                'net_due' => $valuation->net_due,
                'paid_amount' => $this->money($valuation->paidAmount()),
                'balance_due' => $this->money($valuation->balanceDue()),
                'invoice_amount' => $valuation->invoice_amount,
                'invoice_matches' => $valuation->invoice_amount !== null && $valuation->invoiceExpectedAmount()->isEqualTo((string) $valuation->invoice_amount),
            ])->values(),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }

    private function sum(iterable $values, callable $amount): BigDecimal
    {
        $total = BigDecimal::zero();
        foreach ($values as $value) {
            $total = $total->plus($amount($value));
        }

        return $total;
    }

    private function money(BigDecimal $amount): string
    {
        return (string) $amount->toScale(2, RoundingMode::HalfUp);
    }
}
