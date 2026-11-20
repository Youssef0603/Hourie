<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * A material ARH supplies for a work item, with how much of it one unit of
 * work consumes (e.g. 7 bags of cement per m³ of concrete).
 */
#[Fillable(['subcontract_item_id', 'name', 'unit', 'quantity_per_unit', 'waste_percent'])]
class SubcontractItemMaterial extends Model
{
    public function item(): BelongsTo
    {
        return $this->belongsTo(SubcontractItem::class, 'subcontract_item_id');
    }

    /** Purchase order lines that bought this material. */
    public function purchaseOrderItems(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    protected function casts(): array
    {
        return [
            'quantity_per_unit' => 'decimal:4',
            'waste_percent' => 'decimal:2',
        ];
    }
}
