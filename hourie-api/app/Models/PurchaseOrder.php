<?php

namespace App\Models;

use Brick\Math\BigDecimal;
use Brick\Math\RoundingMode;
use Database\Factories\PurchaseOrderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['number', 'created_by_user_id', 'supplier_name', 'supplier_phone', 'supplier_fax', 'ordered_on', 'follow_up_agent', 'contact_name', 'project_name', 'reason', 'prepared_by', 'ordered_by', 'approved_by', 'vat_rate', 'currency', 'notes', 'pdf_disk', 'pdf_path', 'pdf_generated_at'])]
class PurchaseOrder extends Model
{
    /** @use HasFactory<PurchaseOrderFactory> */
    use HasFactory;

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class)->orderBy('position');
    }

    public function deliveryNotes(): HasMany
    {
        return $this->hasMany(PurchaseOrderDeliveryNote::class)->latest();
    }

    public function subtotal(): BigDecimal
    {
        return $this->items->reduce(
            fn (BigDecimal $total, PurchaseOrderItem $item): BigDecimal => $total->plus($item->subtotal()),
            BigDecimal::zero(),
        )->toScale(2, RoundingMode::HalfUp);
    }

    public function vatAmount(): BigDecimal
    {
        return $this->subtotal()->multipliedBy($this->vat_rate)->dividedBy(100, 2, RoundingMode::HalfUp);
    }

    public function total(): BigDecimal
    {
        return $this->subtotal()->plus($this->vatAmount())->toScale(2, RoundingMode::HalfUp);
    }

    protected function casts(): array
    {
        return [
            'ordered_on' => 'date:Y-m-d',
            'vat_rate' => 'decimal:2',
            'pdf_generated_at' => 'datetime',
        ];
    }
}
