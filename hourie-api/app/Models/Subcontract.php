<?php

namespace App\Models;

use Brick\Math\BigDecimal;
use Database\Factories\SubcontractFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable(['reference', 'subcontractor_id', 'project_id', 'created_by_user_id', 'title', 'signed_on', 'vat_rate', 'retention_rate', 'advance_amount', 'advance_recovery_rate', 'cash_percent', 'recurring_deduction_label', 'recurring_deduction_amount', 'historical_works_amount', 'currency', 'status', 'notes'])]
class Subcontract extends Model
{
    /** @use HasFactory<SubcontractFactory> */
    use HasFactory;

    public function subcontractor(): BelongsTo
    {
        return $this->belongsTo(Subcontractor::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SubcontractItem::class)->orderBy('position')->orderBy('id');
    }

    public function variations(): HasMany
    {
        return $this->hasMany(SubcontractVariation::class)->orderBy('sequence');
    }

    public function valuations(): HasMany
    {
        return $this->hasMany(SubcontractValuation::class)->orderBy('sequence');
    }

    /** Situations of work done (regular ones and the opening balance), without the advance. */
    public function workValuations(): HasMany
    {
        return $this->valuations()->where('kind', '!=', SubcontractValuation::KIND_ADVANCE);
    }

    /** The payable entry of the start advance, if the contract has one. */
    public function advanceEntry(): HasOne
    {
        return $this->hasOne(SubcontractValuation::class)->where('kind', SubcontractValuation::KIND_ADVANCE);
    }

    /**
     * Keeps the advance entry in line with the contract: created when the
     * contract has an advance, and recalculated or removed while nothing has
     * been paid on it. Once paid, its amounts are part of the record.
     */
    public function syncAdvanceEntry(int $userId): void
    {
        $entry = $this->advanceEntry()->with('payments')->first();
        $advance = BigDecimal::of((string) $this->advance_amount);

        if ($entry?->payments->isNotEmpty()) {
            return;
        }

        if ($advance->isZero()) {
            $entry?->delete();

            return;
        }

        $split = SubcontractValuation::splitAmount($advance, $this->cash_percent, $this->vat_rate);
        $date = ($this->signed_on ?? now())->format('Y-m-d');
        $attributes = [
            'cash_percent' => $this->cash_percent ?? 0,
            'cash_amount' => (string) $split['cash'],
            'cheque_amount' => (string) $split['cheque'],
            'vat_amount' => (string) $split['vat'],
            'net_due' => (string) $split['net_due'],
        ];

        if ($entry) {
            $entry->update($attributes);

            return;
        }

        $this->valuations()->create([
            ...$attributes,
            'sequence' => 0,
            'kind' => SubcontractValuation::KIND_ADVANCE,
            'reference' => $this->reference.'-AVANCE',
            'valuation_date' => $date,
            'period_end' => $date,
            'status' => SubcontractValuation::STATUS_APPROVED,
            'created_by_user_id' => $userId,
            'approved_by_user_id' => $userId,
            'approved_at' => now(),
        ]);
    }

    /**
     * Due, paid and still owed per payment channel (cash, cheque or transfer
     * before VAT, VAT) across every approved entry: advance, opening balance
     * and situations. Uses the loaded valuations and payments.
     *
     * @return array<'cash'|'cheque'|'vat', array{due: BigDecimal, paid: BigDecimal, balance: BigDecimal}>
     */
    public function channelTotals(): array
    {
        $totals = [];
        foreach (['cash', 'cheque', 'vat'] as $channel) {
            $totals[$channel] = ['due' => BigDecimal::zero(), 'paid' => BigDecimal::zero(), 'balance' => BigDecimal::zero()];
        }

        foreach ($this->valuations as $valuation) {
            if (! $valuation->isCertified()) {
                continue;
            }
            foreach ($valuation->channels() as $channel => $amounts) {
                foreach ($amounts as $key => $amount) {
                    $totals[$channel][$key] = $totals[$channel][$key]->plus($amount);
                }
            }
        }

        return $totals;
    }

    /** The last valuation of work whose amounts are final (approved or paid). */
    public function lastCertifiedValuation(?int $beforeSequence = null): ?SubcontractValuation
    {
        return $this->workValuations()
            ->whereIn('status', SubcontractValuation::CERTIFIED_STATUSES)
            ->when($beforeSequence !== null, fn ($query) => $query->where('sequence', '<', $beforeSequence))
            ->reorder('sequence', 'desc')
            ->first();
    }

    protected function casts(): array
    {
        return [
            'signed_on' => 'date:Y-m-d',
            'vat_rate' => 'decimal:2',
            'retention_rate' => 'decimal:2',
            'advance_amount' => 'decimal:2',
            'advance_recovery_rate' => 'decimal:2',
            'cash_percent' => 'decimal:2',
            'recurring_deduction_amount' => 'decimal:2',
            'historical_works_amount' => 'decimal:2',
        ];
    }
}
