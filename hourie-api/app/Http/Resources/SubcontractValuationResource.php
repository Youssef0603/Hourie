<?php

namespace App\Http\Resources;

use App\Models\SubcontractItem;
use App\Models\SubcontractValuation;
use App\Models\SubcontractValuationDocument;
use App\Services\SubcontractValuationCalculator;
use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Exposes a valuation the way the paper form reads: quantities per work item,
 * then each calculation line from cumulative works down to the net due.
 *
 * @mixin SubcontractValuation
 */
class SubcontractValuationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $subcontract = $this->subcontract;
        $quantities = $this->lines->pluck('cumulative_quantity', 'subcontract_item_id');
        $previousQuantities = app(SubcontractValuationCalculator::class)->previousQuantities($subcontract, $this->sequence);

        $works = BigDecimal::of((string) $this->works_cumulative);
        $previousWorks = BigDecimal::of((string) $this->works_previous);
        $recovery = BigDecimal::of((string) $this->advance_recovery_cumulative);
        $retention = BigDecimal::of((string) $this->retention_cumulative);
        $certified = $works->minus($recovery)->minus($retention);

        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'sequence' => $this->sequence,
            'status' => $this->status,
            'valuation_date' => $this->valuation_date?->format('Y-m-d'),
            'period_end' => $this->period_end?->format('Y-m-d'),
            'comment' => $this->comment,
            'materials_deduction' => $this->materials_deduction,
            'backcharges' => $this->backcharges,
            'subcontract' => [
                'id' => $subcontract->id,
                'reference' => $subcontract->reference,
                'title' => $subcontract->title,
                'subcontractor' => $subcontract->subcontractor->name,
                'project' => $subcontract->project->only(['id', 'code', 'name']),
                'currency' => $subcontract->currency,
                'retention_rate' => $subcontract->retention_rate,
                'advance_amount' => $subcontract->advance_amount,
                'advance_recovery_rate' => $subcontract->advance_recovery_rate,
                'vat_rate' => $subcontract->vat_rate,
            ],
            'lines' => $subcontract->items->map(function (SubcontractItem $item) use ($quantities, $previousQuantities): array {
                $cumulative = BigDecimal::of((string) ($quantities[$item->id] ?? $previousQuantities[$item->id] ?? '0'));
                $previous = BigDecimal::of((string) ($previousQuantities[$item->id] ?? '0'));

                return [
                    'subcontract_item_id' => $item->id,
                    'code' => $item->code,
                    'description' => $item->description,
                    'unit' => $item->unit,
                    'unit_price' => $item->unit_price,
                    'authorized_quantity' => (string) $item->authorizedQuantity()->toScale(3),
                    'previous_quantity' => (string) $previous->toScale(3),
                    'cumulative_quantity' => (string) $cumulative->toScale(3),
                    'period_quantity' => (string) $cumulative->minus($previous)->toScale(3),
                    'cumulative_amount' => (string) $cumulative->multipliedBy((string) $item->unit_price)->toScale(2, RoundingMode::HalfUp),
                ];
            })->values(),
            'calculation' => [
                'works_cumulative' => $this->works_cumulative,
                'works_previous' => $this->works_previous,
                'works_this_period' => (string) $works->minus($previousWorks),
                'advance_recovery_cumulative' => $this->advance_recovery_cumulative,
                'advance_recovery_this_period' => (string) $recovery->minus((string) $this->advance_recovery_previous),
                'retention_cumulative' => $this->retention_cumulative,
                'retention_this_period' => (string) $retention->minus((string) $this->retention_previous),
                'certified_cumulative' => (string) $certified,
                'previously_certified' => $this->previously_certified,
                'this_valuation_before_vat' => (string) $certified->minus((string) $this->previously_certified),
                'vat_amount' => $this->vat_amount,
                'materials_deduction' => $this->materials_deduction,
                'backcharges' => $this->backcharges,
                'net_due' => $this->net_due,
                'advance_remaining' => (string) BigDecimal::of((string) $subcontract->advance_amount)->minus($recovery),
            ],
            'invoice' => $this->invoice_number === null ? null : [
                'number' => $this->invoice_number,
                'date' => $this->invoice_date?->format('Y-m-d'),
                'amount' => $this->invoice_amount,
                'matches' => BigDecimal::of((string) $this->invoice_amount)->isEqualTo((string) $this->net_due),
                'difference' => (string) BigDecimal::of((string) $this->invoice_amount)->minus((string) $this->net_due),
            ],
            'documents' => $this->documents->map(fn (SubcontractValuationDocument $document) => [
                'id' => $document->id,
                'type' => $document->type,
                'url' => route('subcontract-valuations.documents.show', [$this->resource, $document], false),
                'original_name' => $document->original_name,
                'size_bytes' => $document->size_bytes,
                'created_at' => $document->created_at?->toISOString(),
            ])->values(),
            'approved_by' => $this->approver?->name,
            'approved_at' => $this->approved_at?->toISOString(),
            'paid_at' => $this->paid_at?->toISOString(),
        ];
    }
}
