<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['variation_id', 'subcontract_item_id', 'quantity'])]
class SubcontractVariationLine extends Model
{
    public function variation(): BelongsTo
    {
        return $this->belongsTo(SubcontractVariation::class, 'variation_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(SubcontractItem::class, 'subcontract_item_id');
    }

    protected function casts(): array
    {
        return ['quantity' => 'decimal:3'];
    }
}
