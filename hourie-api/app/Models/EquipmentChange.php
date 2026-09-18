<?php

namespace App\Models;

use App\Enums\EquipmentChangeSource;
use App\Enums\EquipmentChangeType;
use Database\Factories\EquipmentChangeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'equipment_id',
    'actor_user_id',
    'equipment_import_id',
    'change_type',
    'source',
    'previous_values',
    'new_values',
    'reason',
    'occurred_at',
])]
class EquipmentChange extends Model
{
    /** @use HasFactory<EquipmentChangeFactory> */
    use HasFactory;

    public const UPDATED_AT = null;

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }

    public function equipmentImport(): BelongsTo
    {
        return $this->belongsTo(EquipmentImport::class);
    }

    protected function casts(): array
    {
        return [
            'change_type' => EquipmentChangeType::class,
            'source' => EquipmentChangeSource::class,
            'previous_values' => 'array',
            'new_values' => 'array',
            'occurred_at' => 'datetime',
        ];
    }
}
