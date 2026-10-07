<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['temporary_admission_id', 'expiry_date', 'reminder_date', 'reminder_type', 'queued_at', 'sent_at', 'failed_at', 'attempts', 'last_error'])]
class TemporaryAdmissionReminder extends Model
{
    public function temporaryAdmission(): BelongsTo
    {
        return $this->belongsTo(TemporaryAdmission::class);
    }

    protected function casts(): array
    {
        return [
            'expiry_date' => 'date:Y-m-d',
            'reminder_date' => 'date:Y-m-d',
            'queued_at' => 'datetime',
            'sent_at' => 'datetime',
            'failed_at' => 'datetime',
            'attempts' => 'integer',
        ];
    }
}
