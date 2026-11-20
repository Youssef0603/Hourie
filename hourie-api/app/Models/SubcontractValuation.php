<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'subcontract_id', 'sequence', 'reference', 'valuation_date', 'period_end', 'status',
    'materials_deduction', 'backcharges', 'comment',
    'works_cumulative', 'works_previous', 'advance_recovery_cumulative', 'advance_recovery_previous',
    'retention_cumulative', 'retention_previous', 'previously_certified', 'vat_amount', 'net_due',
    'invoice_number', 'invoice_date', 'invoice_amount',
    'created_by_user_id', 'approved_by_user_id', 'submitted_at', 'approved_at', 'paid_at',
])]
class SubcontractValuation extends Model
{
    public const STATUS_DRAFT = 'draft';

    public const STATUS_SUBMITTED = 'submitted';

    public const STATUS_APPROVED = 'approved';

    public const STATUS_PAID = 'paid';

    /** Statuses whose amounts are final and count as "previously certified". */
    public const CERTIFIED_STATUSES = [self::STATUS_APPROVED, self::STATUS_PAID];

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

    protected function casts(): array
    {
        return [
            'valuation_date' => 'date:Y-m-d',
            'period_end' => 'date:Y-m-d',
            'invoice_date' => 'date:Y-m-d',
            'materials_deduction' => 'decimal:2',
            'backcharges' => 'decimal:2',
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
