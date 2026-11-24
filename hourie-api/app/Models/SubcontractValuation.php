<?php

namespace App\Models;

use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'subcontract_id', 'sequence', 'kind', 'reference', 'valuation_date', 'period_end', 'status',
    'materials_deduction', 'backcharges', 'cash_percent', 'comment',
    'works_cumulative', 'works_previous', 'advance_recovery_cumulative', 'advance_recovery_previous',
    'retention_cumulative', 'retention_previous', 'previously_certified', 'cash_amount', 'cheque_amount', 'vat_amount', 'net_due',
    'invoice_number', 'invoice_date', 'invoice_amount',
    'created_by_user_id', 'approved_by_user_id', 'submitted_at', 'approved_at', 'paid_at',
])]
class SubcontractValuation extends Model
{
    /** A monthly situation of work done. */
    public const KIND_REGULAR = 'regular';

    /** The advance paid at the start of the contract. */
    public const KIND_ADVANCE = 'advance';

    /** Everything certified before the contract was followed in Hourie. */
    public const KIND_OPENING = 'opening';

    public const STATUS_DRAFT = 'draft';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_APPROVED = 'approved';

    /** Approved, and some but not all of the net due has been paid. */
    public const STATUS_PARTIALLY_PAID = 'partially_paid';

    public const STATUS_PAID = 'paid';

    /** Statuses whose amounts are final and count as "previously certified". */
    public const CERTIFIED_STATUSES = [self::STATUS_APPROVED, self::STATUS_PARTIALLY_PAID, self::STATUS_PAID];

    public function subcontract(): BelongsTo
    {
        return $this->belongsTo(Subcontract::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(SubcontractValuationLine::class, 'valuation_id');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(SubcontractValuationDocument::class, 'valuation_id')->latest();
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SubcontractValuationPayment::class, 'valuation_id')->orderBy('paid_on')->orderBy('id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by_user_id');
    }

    public function isEditable(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isCertified(): bool
    {
        return in_array($this->status, self::CERTIFIED_STATUSES, true);
    }

    /**
     * Splits an amount before VAT between cash and cheque; VAT is charged on
     * the cheque part only, since cash payments carry no invoice.
     *
     * @return array{cash: BigDecimal, cheque: BigDecimal, vat: BigDecimal, net_due: BigDecimal}
     */
    public static function splitAmount(BigDecimal $amount, mixed $cashPercent, mixed $vatRate): array
    {
        $cash = $amount->multipliedBy((string) ($cashPercent ?? 0))->dividedBy(100, 2, RoundingMode::HalfUp);
        $cheque = $amount->toScale(2, RoundingMode::HalfUp)->minus($cash);
        $vat = $cheque->multipliedBy((string) ($vatRate ?? 0))->dividedBy(100, 2, RoundingMode::HalfUp);

        return ['cash' => $cash, 'cheque' => $cheque, 'vat' => $vat, 'net_due' => $cheque->plus($cash)->plus($vat)];
    }

    public function isAdvance(): bool
    {
        return $this->kind === self::KIND_ADVANCE;
    }

    public function isOpening(): bool
    {
        return $this->kind === self::KIND_OPENING;
    }

    /**
     * Amount the subcontractor's invoice must show: the cheque part and its
     * VAT. The advance and the opening balance need no invoice here.
     */
    public function invoiceExpectedAmount(): BigDecimal
    {
        return BigDecimal::of((string) $this->cheque_amount)->plus((string) $this->vat_amount);
    }

    public function requiresInvoice(): bool
    {
        return $this->kind === self::KIND_REGULAR && $this->invoiceExpectedAmount()->isPositive();
    }

    /**
     * What is due, paid and still owed in each payment channel: cash, cheque
     * or transfer before VAT, and VAT. Nothing is owed before approval.
     *
     * @return array<'cash'|'cheque'|'vat', array{due: BigDecimal, paid: BigDecimal, balance: BigDecimal}>
     */
    public function channels(): array
    {
        $paid = ['cash' => BigDecimal::zero(), 'cheque' => BigDecimal::zero(), 'vat' => BigDecimal::zero()];
        foreach ($this->payments as $payment) {
            $vat = BigDecimal::of((string) $payment->vat_amount);
            if ($payment->isCash()) {
                $paid['cash'] = $paid['cash']->plus((string) $payment->amount);
            } else {
                $paid['cheque'] = $paid['cheque']->plus(BigDecimal::of((string) $payment->amount)->minus($vat));
                $paid['vat'] = $paid['vat']->plus($vat);
            }
        }

        $due = [
            'cash' => BigDecimal::of((string) $this->cash_amount),
            'cheque' => BigDecimal::of((string) $this->cheque_amount),
            'vat' => BigDecimal::of((string) $this->vat_amount),
        ];

        return collect($due)->map(function (BigDecimal $amount, string $channel) use ($paid): array {
            $owed = $this->isCertified() ? $amount->minus($paid[$channel]) : BigDecimal::zero();

            return ['due' => $amount, 'paid' => $paid[$channel], 'balance' => $owed->isNegative() ? BigDecimal::zero() : $owed];
        })->all();
    }

    /** Total of the payments recorded so far. */
    public function paidAmount(): BigDecimal
    {
        return $this->payments->reduce(
            fn (BigDecimal $total, SubcontractValuationPayment $payment) => $total->plus((string) $payment->amount),
            BigDecimal::zero(),
        );
    }

    /** What is still owed on this valuation once it is approved; zero before approval. */
    public function balanceDue(): BigDecimal
    {
        if (! $this->isCertified()) {
            return BigDecimal::zero();
        }

        $balance = BigDecimal::of((string) $this->net_due)->minus($this->paidAmount());

        return $balance->isNegative() ? BigDecimal::zero() : $balance;
    }

    protected function casts(): array
    {
        return [
            'valuation_date' => 'date:Y-m-d',
            'period_end' => 'date:Y-m-d',
            'invoice_date' => 'date:Y-m-d',
            'materials_deduction' => 'decimal:2',
            'backcharges' => 'decimal:2',
            'cash_percent' => 'decimal:2',
            'cash_amount' => 'decimal:2',
            'cheque_amount' => 'decimal:2',
            'works_cumulative' => 'decimal:2',
            'works_previous' => 'decimal:2',
            'advance_recovery_cumulative' => 'decimal:2',
            'advance_recovery_previous' => 'decimal:2',
            'retention_cumulative' => 'decimal:2',
            'retention_previous' => 'decimal:2',
            'previously_certified' => 'decimal:2',
            'vat_amount' => 'decimal:2',
            'net_due' => 'decimal:2',
            'invoice_amount' => 'decimal:2',
            'submitted_at' => 'datetime',
            'approved_at' => 'datetime',
            'paid_at' => 'datetime',
        ];
    }
}
