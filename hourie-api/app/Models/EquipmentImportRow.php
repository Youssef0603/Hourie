<?php

namespace App\Models;

use App\Enums\EquipmentImportRowStatus;
use Database\Factories\EquipmentImportRowFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'equipment_import_id',
    'equipment_id',
    'sheet_name',
    'row_number',
    'source_asset_code',
    'status',
    'raw_data',
    'messages',
])]
class EquipmentImportRow extends Model
{
    /** @use HasFactory<EquipmentImportRowFactory> */
    use HasFactory;

    public function equipmentImport(): BelongsTo
    {
        return $this->belongsTo(EquipmentImport::class);
    }

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    protected function casts(): array
    {
        return [
            'status' => EquipmentImportRowStatus::class,
            'raw_data' => 'array',
            'messages' => 'array',
        ];
    }
}
