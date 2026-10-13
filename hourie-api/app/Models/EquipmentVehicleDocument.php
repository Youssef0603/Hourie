<?php

namespace App\Models;

use App\Enums\VehicleDocumentType;
use Database\Factories\EquipmentVehicleDocumentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['equipment_id', 'uploaded_by_user_id', 'document_type', 'issued_on', 'expires_on', 'disk', 'path', 'original_name', 'mime_type', 'size_bytes'])]
class EquipmentVehicleDocument extends Model
{
    /** @use HasFactory<EquipmentVehicleDocumentFactory> */
    use HasFactory;

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }

    protected function casts(): array
    {
        return [
            'document_type' => VehicleDocumentType::class,
            'issued_on' => 'date:Y-m-d',
            'expires_on' => 'date:Y-m-d',
        ];
    }
}
