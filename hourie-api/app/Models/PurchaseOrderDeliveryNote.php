<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['purchase_order_id', 'uploaded_by_user_id', 'disk', 'path', 'original_name', 'mime_type', 'size_bytes'])]
class PurchaseOrderDeliveryNote extends Model
{
    /** @var array<int, string> */
    protected $touches = ['purchaseOrder'];

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }
}
