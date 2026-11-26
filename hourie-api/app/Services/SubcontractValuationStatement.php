<?php

namespace App\Services;

use App\Models\SubcontractItem;
use App\Models\SubcontractValuation;
use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;
use Illuminate\Support\Collection;

/**
 * Every figure of the PM's subcontractor valuation, numbered like his file:
 * A valuation status (lines 01-18), B advance (19-22), C retention (23-26),
 * D payment status (27-40), E cumulative financial status (41-50),
 * F reconciliation checks (51-62), G payment history, and the DG synthesis.
 *
 * The cumulative sections count the advance, every approved entry and the
 * valuation being printed, even while it is still a draft.
 */
class SubcontractValuationStatement
{
    /**
     * @return array<string, mixed>
     */
    public function build(SubcontractValuation $valuation): array
    {
        $subcontract = $valuation->subcontract;
        $zero = BigDecimal::zero();
        $previous = $valuation->isAdvance() ? null : $subcontract->lastCertifiedValuation($valuation->sequence);

        $current = $valuation->lines->pluck('cumulative_quantity', 'subcontract_item_id');
        $before = $previous?->lines()->pluck('cumulative_quantity', 'subcontract_item_id') ?? collect();
        $amountOf = fn (Collection $quantities, bool $variation): BigDecimal => $subcontract->items
            ->filter(fn (SubcontractItem $item): bool => ($item->variation_id !== null) === $variation)
            ->reduce(fn (BigDecimal $total, SubcontractItem $item): BigDecimal => $total->plus(
                BigDecimal::of((string) ($quantities[$item->id] ?? '0'))->multipliedBy((string) $item->unit_price),
            ), $zero)
            ->toScale(2, RoundingMode::HalfUp);

        $original = $amountOf($current, false);
        $variations = $amountOf($current, true);
        $onSite = $this->amount($valuation->materials_on_site);
        $historical = $this->amount($subcontract->historical_works_amount);
        $claims = $this->amount($valuation->claims);
        $totalWorks = $original->plus($variations)->plus($onSite)->plus($historical);
        $grossWorks = $totalWorks->plus($claims);
        $previousGross = $this->amount($valuation->works_previous);
        $currentGross = $grossWorks->minus($previousGross);
        $advanceRecovery = $this->amount($valuation->advance_recovery_cumulative)->minus($this->amount($valuation->advance_recovery_previous));
        $afterRecovery = $currentGross->minus($advanceRecovery);
        $retention = $this->amount($valuation->retention_cumulative)->minus($this->amount($valuation->retention_previous));
        $retentionReleased = $zero;
        $netBeforeAdjustments = $afterRecovery->minus($retention)->plus($retentionReleased);
        $materials = $this->amount($valuation->materials_deduction);
        $otherDeductions = $this->amount($valuation->backcharges);
        $netCertified = $this->amount($valuation->cash_amount)->plus($this->amount($valuation->cheque_amount));

        $channels = $valuation->channels();
        $plannedCash = $channels['cash']['due'];
        $plannedCheque = $channels['cheque']['due'];
        $cashPaid = $channels['cash']['paid'];
        $chequePaid = $channels['cheque']['paid'];
        $expectedVat = $channels['vat']['due'];
        $vatPaid = $channels['vat']['paid'];

        $entries = $subcontract->valuations
            ->filter(fn (SubcontractValuation $entry): bool => $entry->isCertified() || $entry->id === $valuation->id)
            ->sortBy('sequence')
            ->values();
        $beforeEntries = $entries->reject(fn (SubcontractValuation $entry): bool => $entry->id === $valuation->id);
        $totals = fn (Collection $list): array => $this->channelTotals($list);
        $cumulative = $totals($entries);
        $prior = $totals($beforeEntries);
        $selected = $totals(collect([$valuation]));

        $advance = $this->amount($subcontract->advance_amount);
        $advanceEntry = $entries->first(fn (SubcontractValuation $entry): bool => $entry->isAdvance());
        $workEntries = $entries->reject(fn (SubcontractValuation $entry): bool => $entry->isAdvance());
        $certifiedWorkNet = $workEntries->reduce(fn (BigDecimal $total, SubcontractValuation $entry): BigDecimal => $total->plus($this->netHt($entry)), $zero);
        $payableWithAdvance = $certifiedWorkNet->plus($advanceEntry ? $this->netHt($advanceEntry) : $zero);
        $unpaid = $payableWithAdvance->minus($cumulative['cash']['paid'])->minus($cumulative['cheque']['paid']);
        $vatBalance = $cumulative['vat']['due']->minus($cumulative['vat']['paid']);
        $advanceRemaining = $advance->minus($this->amount($valuation->advance_recovery_cumulative));
        $retentionHeld = $this->amount($valuation->retention_cumulative);

        $lines = [
            '01' => $original, '02' => $variations, '03' => $onSite, '03A' => $historical, '04' => $totalWorks,
            '05' => $claims, '06' => $grossWorks, '07' => $previousGross, '08' => $currentGross,
            '09' => $advanceRecovery, '10' => $afterRecovery, '11' => $retention, '12' => $retentionReleased,
            '13' => $netBeforeAdjustments, '14' => $zero, '15' => $zero, '16' => $materials, '17' => $otherDeductions,
            '18' => $netCertified,
            '19' => $advance, '20' => $this->amount($valuation->advance_recovery_previous),
            '21' => $this->amount($valuation->advance_recovery_cumulative), '22' => $advanceRemaining,
            '23' => $this->amount($valuation->retention_previous), '24' => $retention, '25' => $zero, '26' => $retentionHeld,
            '27' => $netCertified, '29' => $plannedCash, '30' => $plannedCheque, '31' => $cashPaid, '32' => $chequePaid,
            '33' => $cashPaid->plus($chequePaid), '34' => $plannedCash->minus($cashPaid), '35' => $plannedCheque->minus($chequePaid),
            '36' => $plannedCash->minus($cashPaid)->plus($plannedCheque)->minus($chequePaid),
            '37' => $expectedVat, '38' => $vatPaid, '39' => $expectedVat->minus($vatPaid),
            '41' => $certifiedWorkNet, '42' => $payableWithAdvance,
            '43' => $cumulative['cash']['paid'], '44' => $cumulative['cheque']['paid'], '45' => $unpaid,
            '46' => $cumulative['vat']['due'], '47' => $cumulative['vat']['paid'], '48' => $vatBalance,
            '49' => $advanceRemaining, '50' => $retentionHeld,
        ];
        $lines['40'] = $lines['36']->plus($lines['39']);

        $previousOriginal = $amountOf($before, false);
        $previousVariations = $amountOf($before, true);
        $currentColumn = [
            '01' => $original->minus($previousOriginal),
            '02' => $variations->minus($previousVariations),
            '03' => $onSite->minus($this->amount($previous?->materials_on_site)),
            '03A' => $previous === null ? $historical : $zero,
            '05' => $claims->minus($this->amount($previous?->claims)),
        ];

        $checks = [
            '51' => $lines['13']->plus($lines['14'])->minus($lines['15'])->minus($lines['16'])->minus($lines['17'])->minus($lines['18']),
            '52' => $lines['19']->minus($lines['21'])->minus($lines['22']),
            '53' => $lines['23']->plus($lines['24'])->minus($lines['25'])->minus($lines['26']),
            '54' => $lines['27']->minus($lines['33'])->minus($lines['36']),
            '55' => $lines['27']->minus($lines['29'])->minus($lines['30']),
            '56' => $lines['37']->minus($lines['38'])->minus($lines['39']),
            '57' => $lines['42']->minus($lines['43'])->minus($lines['44'])->minus($lines['45']),
            '58' => $lines['46']->minus($lines['47'])->minus($lines['48']),
        ];
        $passes = collect($checks)->every(fn (BigDecimal $difference): bool => $difference->abs()->isLessThan('0.01'));

        $priorWorkEntries = $beforeEntries->reject(fn (SubcontractValuation $entry): bool => $entry->isAdvance());
        $paidHt = fn (Collection $list): BigDecimal => $list->reduce(function (BigDecimal $total, SubcontractValuation $entry): BigDecimal {
            $entryChannels = $entry->channels();

            return $total->plus($entryChannels['cash']['paid'])->plus($entryChannels['cheque']['paid']);
        }, $zero);
        $history = [
            'advance' => $this->historyRow($advanceEntry ? $this->netHt($advanceEntry) : $zero, $advanceEntry ? $paidHt(collect([$advanceEntry])) : $zero),
            'prior' => $this->historyRow($priorWorkEntries->reduce(fn (BigDecimal $total, SubcontractValuation $entry): BigDecimal => $total->plus($this->netHt($entry)), $zero), $paidHt($priorWorkEntries)),
            'current' => $this->historyRow($valuation->isAdvance() ? $zero : $netCertified, $valuation->isAdvance() ? $zero : $cashPaid->plus($chequePaid)),
        ];
        $history['total'] = $this->historyRow(
            $history['advance']['net']->plus($history['prior']['net'])->plus($history['current']['net']),
            $history['advance']['paid']->plus($history['prior']['paid'])->plus($history['current']['paid']),
        );

        return [
            'lines' => $lines,
            'current' => $currentColumn,
            'checks' => $checks,
            'passes' => $passes,
            'history' => $history,
            'selected' => $selected,
            'prior' => $prior,
            'cumulative' => $cumulative,
            'original_contract' => $subcontract->items->whereNull('variation_id')->reduce(
                fn (BigDecimal $total, SubcontractItem $item): BigDecimal => $total->plus(BigDecimal::of((string) $item->quantity)->multipliedBy((string) $item->unit_price)),
                $zero,
            ),
            'revised_contract' => $subcontract->items->reduce(
                fn (BigDecimal $total, SubcontractItem $item): BigDecimal => $total->plus($item->authorizedQuantity()->multipliedBy((string) $item->unit_price)),
                $zero,
            ),
        ];
    }

    /**
     * Planned, paid and still owed per channel over the given entries. The
     * printed valuation counts as planned even before it is approved.
     *
     * @param  Collection<int, SubcontractValuation>  $entries
     * @return array<'cash'|'cheque'|'vat'|'total', array{due: BigDecimal, paid: BigDecimal, balance: BigDecimal}>
     */
    private function channelTotals(Collection $entries): array
    {
        $totals = [];
        foreach (['cash', 'cheque', 'vat', 'total'] as $channel) {
            $totals[$channel] = ['due' => BigDecimal::zero(), 'paid' => BigDecimal::zero(), 'balance' => BigDecimal::zero()];
        }

        foreach ($entries as $entry) {
            foreach ($entry->channels() as $channel => $amounts) {
                foreach (['due', 'paid'] as $key) {
                    $totals[$channel][$key] = $totals[$channel][$key]->plus($amounts[$key]);
                    $totals['total'][$key] = $totals['total'][$key]->plus($amounts[$key]);
                }
            }
        }

        foreach ($totals as $channel => $amounts) {
            $totals[$channel]['balance'] = $amounts['due']->minus($amounts['paid']);
        }

        return $totals;
    }

    /** @return array{net: BigDecimal, paid: BigDecimal, outstanding: BigDecimal} */
    private function historyRow(BigDecimal $net, BigDecimal $paid): array
    {
        return ['net' => $net, 'paid' => $paid, 'outstanding' => $net->minus($paid)];
    }

    private function netHt(SubcontractValuation $entry): BigDecimal
    {
        return $this->amount($entry->cash_amount)->plus($this->amount($entry->cheque_amount));
    }

    private function amount(mixed $value): BigDecimal
    {
        return BigDecimal::of((string) ($value ?? '0'));
    }
}
