<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['valuation_id', 'subcontract_item_id', 'cumulative_quantity'])]
class SubcontractValuationLine extends Model
{
    public function valuation(): BelongsTo
    {
        return $this->belongsTo(SubcontractValuation::class, 'valuation_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(SubcontractItem::class, 'subcontract_item_id');
    }

    protected function casts(): array
    {
        return ['cumulative_quantity' => 'decimal:3'];
    }
}
