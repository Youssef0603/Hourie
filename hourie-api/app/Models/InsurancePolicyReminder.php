<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InsurancePolicyReminder extends Model
{
    public $timestamps = false;
    protected $fillable = ['insurance_policy_id', 'expiry_date', 'reminder_date', 'reminder_type', 'sent_at'];
    protected function casts(): array { return ['expiry_date' => 'date:Y-m-d', 'reminder_date' => 'date:Y-m-d', 'sent_at' => 'datetime']; }
}
