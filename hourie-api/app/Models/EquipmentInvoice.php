<?php

namespace App\Models;

use Database\Factories\EquipmentInvoiceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['equipment_id', 'uploaded_by_user_id', 'disk', 'path', 'original_name', 'mime_type', 'size_bytes'])]
class EquipmentInvoice extends Model
{
    /** @use HasFactory<EquipmentInvoiceFactory> */
    use HasFactory;

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }
}
