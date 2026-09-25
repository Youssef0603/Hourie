<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['equipment_id', 'inspection_date', 'reminder_date', 'reminder_type', 'sent_at'])]
class EquipmentInspectionReminder extends Model
{
    public $timestamps = false;

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    protected function casts(): array
    {
        return [
            'inspection_date' => 'date:Y-m-d',
            'reminder_date' => 'date:Y-m-d',
            'sent_at' => 'datetime',
        ];
    }
}
