<?php

namespace App\Models;

use App\Enums\EquipmentImportStatus;
use Database\Factories\EquipmentImportFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['imported_by_user_id', 'original_filename', 'file_sha256', 'status', 'imported_at', 'summary'])]
class EquipmentImport extends Model
{
    /** @use HasFactory<EquipmentImportFactory> */
    use HasFactory;

    public function importedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'imported_by_user_id');
    }

    public function rows(): HasMany
    {
        return $this->hasMany(EquipmentImportRow::class);
    }

    public function changes(): HasMany
    {
        return $this->hasMany(EquipmentChange::class);
    }

    protected function casts(): array
    {
        return [
            'status' => EquipmentImportStatus::class,
            'imported_at' => 'datetime',
            'summary' => 'array',
        ];
    }
}
