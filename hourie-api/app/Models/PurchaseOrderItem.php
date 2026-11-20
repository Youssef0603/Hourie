<?php

namespace App\Models;

use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;
use Database\Factories\PurchaseOrderItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['purchase_order_id', 'position', 'budget_code', 'subcontract_item_material_id', 'description', 'quantity', 'unit', 'unit_price'])]
class PurchaseOrderItem extends Model
{
    /** @use HasFactory<PurchaseOrderItemFactory> */
    use HasFactory;

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    /** The subcontract material this line bought, if it was bought for a work item. */
    public function subcontractMaterial(): BelongsTo
    {
        return $this->belongsTo(SubcontractItemMaterial::class, 'subcontract_item_material_id');
    }

    public function subtotal(): BigDecimal
    {
        return BigDecimal::of($this->quantity)->multipliedBy($this->unit_price)->toScale(2, RoundingMode::HalfUp);
    }

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price' => 'decimal:2',
        ];
    }
}
