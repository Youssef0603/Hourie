<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable([
    'customs_reference',
    'supplier_name',
    'entered_on',
    'validity_months',
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

        $admissionDocuments = match (true) {
            $this->relationLoaded('documents') => $this->documents
                ->where('document_type', 'admission')
                ->values(),
            default => $this->documents()
                ->where('document_type', 'admission')
                ->get(),
        };

        $enteredOn = CarbonImmutable::parse($this->entered_on);
        $initialValidityMonths = (int) ($this->validity_months ?? 12);
        $expiresOn = $enteredOn->addMonthsNoOverflow($initialValidityMonths);
        $hasPreviousAt = false;

        foreach ($admissionDocuments
            ->filter(fn (TemporaryAdmissionDocument $document) => $document->document_date !== null)
            ->sortBy(fn (TemporaryAdmissionDocument $document) => ($document->document_date?->format('Y-m-d') ?? '').'-'.str_pad((string) $document->id, 20, '0', STR_PAD_LEFT))
            ->groupBy(fn (TemporaryAdmissionDocument $document) => $document->document_date?->format('Y-m-d')) as $documentsForDate) {
            $document = $documentsForDate->last();
            $documentDate = CarbonImmutable::parse($document->document_date);
            $validityMonths = (int) ($document->validity_months ?? $initialValidityMonths);

            if ($documentDate->lessThanOrEqualTo($expiresOn)) {
                if ($hasPreviousAt) {
                    $expiresOn = $expiresOn->addMonthsNoOverflow($validityMonths);
                }
            } else {
                $period = 1;
                do {
                    $expiresOn = $enteredOn->addMonthsNoOverflow($validityMonths * $period);
                    $period++;
                } while ($expiresOn->lessThanOrEqualTo($documentDate));
            }

            $hasPreviousAt = true;
        }

        return $expiresOn;
    }

    protected function casts(): array
    {
        return [
            'entered_on' => 'date:Y-m-d',
            'validity_months' => 'integer',
            'returned_on' => 'date:Y-m-d',
            'cleared_on' => 'date:Y-m-d',
            'customs_duty_amount' => 'decimal:2',
        ];
    }
}
