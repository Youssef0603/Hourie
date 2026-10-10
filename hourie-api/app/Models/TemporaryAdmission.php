<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'customs_reference',
    'entered_on',
    'status',
    'returned_on',
    'closure_reason',
    'cleared_on',
    'clearance_reference',
    'customs_duty_amount',
    'notes',
    'created_by_user_id',
])]
class TemporaryAdmission extends Model
{
    public function equipment(): BelongsToMany
    {
        return $this->belongsToMany(Equipment::class, 'temporary_admission_equipment');
    }

    public function documents(): HasMany
    {
        return $this->hasMany(TemporaryAdmissionDocument::class);
    }

    public function changes(): HasMany
    {
        return $this->hasMany(TemporaryAdmissionChange::class)->latest('occurred_at')->latest('id');
    }

    public function reminders(): HasMany
    {
        return $this->hasMany(TemporaryAdmissionReminder::class);
    }

    public function expiresOn(): ?CarbonImmutable
    {
        if ($this->entered_on === null) {
            return null;
        }

        $renewalCount = $this->relationLoaded('documents')
            ? $this->documents->where('document_type', 'renewal')->count()
            : $this->documents()->where('document_type', 'renewal')->count();

        return CarbonImmutable::parse($this->entered_on)->addYears($renewalCount + 1);
    }

    protected function casts(): array
    {
        return [
            'entered_on' => 'date:Y-m-d',
            'returned_on' => 'date:Y-m-d',
            'cleared_on' => 'date:Y-m-d',
            'customs_duty_amount' => 'decimal:2',
        ];
    }
}
