<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InsurancePolicyReminder extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'insurance_policy_id', 'expiry_date', 'reminder_date', 'reminder_type', 'queued_at', 'sent_at', 'failed_at', 'attempts', 'last_error',
    ];

    protected function casts(): array
    {
        return [
            'expiry_date' => 'date:Y-m-d', 'reminder_date' => 'date:Y-m-d', 'queued_at' => 'datetime', 'sent_at' => 'datetime',
            'failed_at' => 'datetime', 'attempts' => 'integer',
        ];
    }

    public function policy(): BelongsTo
    {
        return $this->belongsTo(InsurancePolicy::class, 'insurance_policy_id');
    }
}
