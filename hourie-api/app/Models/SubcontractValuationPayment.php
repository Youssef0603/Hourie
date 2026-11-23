<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['valuation_id', 'amount', 'paid_on', 'method', 'reference', 'notes', 'recorded_by_user_id'])]
class SubcontractValuationPayment extends Model
{
    public const METHODS = ['transfer', 'cheque', 'cash'];

    public function valuation(): BelongsTo
    {
        return $this->belongsTo(SubcontractValuation::class, 'valuation_id');
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by_user_id');
    }

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'paid_on' => 'date:Y-m-d',
        ];
    }
}
