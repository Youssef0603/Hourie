<?php

namespace App\Services;

use App\Models\Subcontract;
use App\Models\SubcontractItem;
use App\Models\SubcontractValuation;
use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;
use Illuminate\Support\Collection;

/**
 * Applies the subcontractor valuation method: every valuation states the
 * cumulative quantity executed to date, and the amount payable is the
 * cumulative certified amount minus what earlier valuations certified.
 *
 *   works (cumulative)            = Σ cumulative quantity × unit price
 *                                   + works certified before Hourie without a breakdown
 *   advance recovery (cumulative) = min(works × recovery %, advance received)
 *   retention (cumulative)        = works × retention %
 *   certified (cumulative)        = works − advance recovery − retention
 *   net before VAT                = certified − previously certified − materials − backcharges
 *   cash part                     = net before VAT × cash %
 *   cheque part                   = net before VAT − cash part
 *   VAT                           = VAT % × cheque part (cash carries no VAT)
 *   net due                       = net before VAT + VAT
 */
class SubcontractValuationCalculator
{
    /**
     * Cumulative quantity per item from the last certified valuation before the given one.
     *
     * @return Collection<int, string> item id => cumulative quantity
     */
    public function previousQuantities(Subcontract $subcontract, ?int $beforeSequence = null): Collection
    {
        $previous = $subcontract->lastCertifiedValuation($beforeSequence);

        return $previous === null
            ? collect()
            : $previous->lines()->pluck('cumulative_quantity', 'subcontract_item_id');
    }

    /**
     * Recalculates and stores the amounts of a valuation from its lines.
     */
    public function calculate(SubcontractValuation $valuation): SubcontractValuation
    {
        $subcontract = $valuation->subcontract;
        $items = $subcontract->items()->get()->keyBy('id');
        $quantities = $valuation->lines()->pluck('cumulative_quantity', 'subcontract_item_id');
        $previous = $subcontract->lastCertifiedValuation($valuation->sequence);

        $works = $items->reduce(
            fn (BigDecimal $total, SubcontractItem $item): BigDecimal => $total->plus(
                BigDecimal::of((string) ($quantities[$item->id] ?? '0'))->multipliedBy((string) $item->unit_price),
            ),
            BigDecimal::zero(),
        )->plus((string) $subcontract->historical_works_amount)->toScale(2, RoundingMode::HalfUp);

        $advanceRecovery = BigDecimal::min(
            $this->percentOf($works, $subcontract->advance_recovery_rate),
            BigDecimal::of((string) $subcontract->advance_amount),
        );
        $retention = $this->percentOf($works, $subcontract->retention_rate);

        $previousWorks = BigDecimal::of((string) ($previous?->works_cumulative ?? '0'));
        $previousRecovery = BigDecimal::of((string) ($previous?->advance_recovery_cumulative ?? '0'));
        $previousRetention = BigDecimal::of((string) ($previous?->retention_cumulative ?? '0'));
        $previouslyCertified = $previousWorks->minus($previousRecovery)->minus($previousRetention);

        $certified = $works->minus($advanceRecovery)->minus($retention);
        $netBeforeVat = $certified->minus($previouslyCertified)
            ->minus((string) $valuation->materials_deduction)
            ->minus((string) $valuation->backcharges);
        $split = SubcontractValuation::splitAmount($netBeforeVat, $valuation->cash_percent, $subcontract->vat_rate);

        $valuation->update([
            'works_cumulative' => (string) $works,
            'works_previous' => (string) $previousWorks,
            'advance_recovery_cumulative' => (string) $advanceRecovery,
            'advance_recovery_previous' => (string) $previousRecovery,
            'retention_cumulative' => (string) $retention,
            'retention_previous' => (string) $previousRetention,
            'previously_certified' => (string) $previouslyCertified->toScale(2, RoundingMode::HalfUp),
            'cash_amount' => (string) $split['cash'],
            'cheque_amount' => (string) $split['cheque'],
            'vat_amount' => (string) $split['vat'],
            'net_due' => (string) $split['net_due'],
        ]);

        return $valuation;
    }

    private function percentOf(BigDecimal $amount, mixed $rate): BigDecimal
    {
        return $amount->multipliedBy((string) $rate)->dividedBy(100, 2, RoundingMode::HalfUp);
    }
}
