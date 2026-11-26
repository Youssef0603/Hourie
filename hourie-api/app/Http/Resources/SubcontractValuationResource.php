<?php

namespace App\Http\Resources;

use App\Models\SubcontractItem;
use App\Models\SubcontractValuation;
use App\Models\SubcontractValuationDocument;
use App\Models\SubcontractValuationPayment;
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
        $locations = $this->lines->pluck('location', 'subcontract_item_id');
        $previousQuantities = app(SubcontractValuationCalculator::class)->previousQuantities($subcontract, $this->sequence);

        $works = BigDecimal::of((string) $this->works_cumulative);
        $previousWorks = BigDecimal::of((string) $this->works_previous);
        $recovery = BigDecimal::of((string) $this->advance_recovery_cumulative);
        $retention = BigDecimal::of((string) $this->retention_cumulative);
        $certified = $works->minus($recovery)->minus($retention);
        $invoiceExpected = $this->invoiceExpectedAmount();

        return [
            'id' => $this->id,
            'reference' => $this->reference,
            'sequence' => $this->sequence,
            'kind' => $this->kind,
            'status' => $this->status,
            'valuation_date' => $this->valuation_date?->format('Y-m-d'),
            'period_end' => $this->period_end?->format('Y-m-d'),
            'comment' => $this->comment,
            'materials_on_site' => $this->materials_on_site,
            'claims' => $this->claims,
            'materials_deduction' => $this->materials_deduction,
            'backcharges' => $this->backcharges,
            'cash_percent' => $this->cash_percent,
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
                'cash_percent' => $subcontract->cash_percent,
            ],
            'lines' => $this->isAdvance() ? [] : $subcontract->items->map(function (SubcontractItem $item) use ($quantities, $locations, $previousQuantities): array {
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
                    'location' => $locations[$item->id] ?? null,
                    'period_amount' => (string) $cumulative->minus($previous)->multipliedBy((string) $item->unit_price)->toScale(2, RoundingMode::HalfUp),
                    'cumulative_amount' => (string) $cumulative->multipliedBy((string) $item->unit_price)->toScale(2, RoundingMode::HalfUp),
                ];
            })->values(),
            'calculation' => [
                'works_cumulative' => $this->works_cumulative,
                'historical_works' => $subcontract->historical_works_amount,
                'works_previous' => $this->works_previous,
                'works_this_period' => (string) $works->minus($previousWorks),
                'advance_recovery_cumulative' => $this->advance_recovery_cumulative,
                'advance_recovery_this_period' => (string) $recovery->minus((string) $this->advance_recovery_previous),
                'retention_cumulative' => $this->retention_cumulative,
                'retention_this_period' => (string) $retention->minus((string) $this->retention_previous),
                'certified_cumulative' => (string) $certified,
                'previously_certified' => $this->previously_certified,
                'this_valuation_before_vat' => (string) $certified->minus((string) $this->previously_certified),
                'materials_deduction' => $this->materials_deduction,
                'backcharges' => $this->backcharges,
                'net_before_vat' => (string) BigDecimal::of((string) $this->cash_amount)->plus((string) $this->cheque_amount),
                'cash_amount' => $this->cash_amount,
                'cheque_amount' => $this->cheque_amount,
                'vat_amount' => $this->vat_amount,
                'net_due' => $this->net_due,
                'advance_remaining' => (string) BigDecimal::of((string) $subcontract->advance_amount)->minus($recovery),
            ],
            'requires_invoice' => $this->requiresInvoice(),
            'invoice_expected' => (string) $invoiceExpected->toScale(2),
            'invoice' => $this->invoice_number === null ? null : [
                'number' => $this->invoice_number,
                'date' => $this->invoice_date?->format('Y-m-d'),
                'amount' => $this->invoice_amount,
                'matches' => $invoiceExpected->isEqualTo((string) $this->invoice_amount),
                'difference' => (string) BigDecimal::of((string) $this->invoice_amount)->minus($invoiceExpected),
            ],
            'channels' => collect($this->channels())->map(fn (array $channel) => array_map(fn (BigDecimal $amount) => (string) $amount->toScale(2), $channel))->all(),
            'paid_amount' => (string) $this->paidAmount()->toScale(2),
            'balance_due' => (string) $this->balanceDue()->toScale(2),
            'payments' => $this->payments->map(fn (SubcontractValuationPayment $payment) => [
                'id' => $payment->id,
                'amount' => $payment->amount,
                'vat_amount' => $payment->vat_amount,
                'paid_on' => $payment->paid_on?->format('Y-m-d'),
                'method' => $payment->method,
                'reference' => $payment->reference,
                'notes' => $payment->notes,
                'recorded_by' => $payment->recorder?->name,
            ])->values(),
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
