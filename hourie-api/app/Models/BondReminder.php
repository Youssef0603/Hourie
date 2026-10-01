<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['bond_id', 'expiry_date', 'reminder_date', 'reminder_type', 'sent_at'])]
class BondReminder extends Model
{
    public $timestamps = false;

    public function bond(): BelongsTo
    {
        return $this->belongsTo(Bond::class);
    }

    protected function casts(): array
    {
        return [
            'expiry_date' => 'date:Y-m-d',
            'reminder_date' => 'date:Y-m-d',
            'sent_at' => 'datetime',
        ];
    }
}
