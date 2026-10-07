<?php

namespace App\Actions\Equipment;

use App\Jobs\SendCarInspectionReminderJob;
use App\Models\ApplicationSetting;
use App\Models\Equipment;
use App\Models\EquipmentInspectionReminder;
use Carbon\CarbonImmutable;
use Carbon\Exceptions\InvalidFormatException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class SendCarInspectionReminder
{
    public function handle(Equipment $car, ?CarbonImmutable $today = null, bool $force = false): bool
    {
        $today ??= CarbonImmutable::today();
        $car->loadMissing(['category', 'custodian']);
        $inspectionDate = $this->inspectionDate($car);

        if ($car->category?->code !== 'car' || $inspectionDate === null) {
            return false;
        }

        $reminderType = $force ? 'manual_test' : $this->reminderType($car, $inspectionDate, $today);
        if ($reminderType === null || (! $force && $this->alreadySentToday($car, $inspectionDate, $today))) {
            return false;
        }

        if ($this->recipients()->isEmpty()) {
            return false;
        }

        $reminder = DB::transaction(function () use ($car, $inspectionDate, $reminderType, $today): EquipmentInspectionReminder {
            $reminder = EquipmentInspectionReminder::query()->firstOrCreate([
                'equipment_id' => $car->id,
                'inspection_date' => $inspectionDate->toDateString(),
                'reminder_date' => $today->toDateString(),
            ], [
                'reminder_type' => $reminderType,
                'queued_at' => now(),
            ]);

            if ($reminder->wasRecentlyCreated) {
                SendCarInspectionReminderJob::dispatch($reminder->id)->afterCommit();
            }

            return $reminder;
        });

        return $reminder->wasRecentlyCreated;
    }

    /** @return Collection<int, string> */
    public function recipients(): Collection
    {
        return collect(ApplicationSetting::reminderRecipients())
            ->filter(fn (mixed $email): bool => is_string($email) && filter_var($email, FILTER_VALIDATE_EMAIL) !== false)
            ->unique()
            ->values();
    }

    private function inspectionDate(Equipment $car): ?CarbonImmutable
    {
        $value = $car->asset_details['inspection_date'] ?? null;

        if (! is_string($value) || $value === '') {
            return null;
        }

        try {
            return CarbonImmutable::createFromFormat('Y-m-d', $value)->startOfDay();
        } catch (InvalidFormatException) {
            return null;
        }
    }

    private function reminderType(Equipment $car, CarbonImmutable $inspectionDate, CarbonImmutable $today): ?string
    {
        if ($today->greaterThanOrEqualTo($inspectionDate) || $today->lessThan($inspectionDate->subMonthNoOverflow())) {
            return null;
        }

        $lastReminderDate = EquipmentInspectionReminder::query()
            ->where('equipment_id', $car->id)
            ->whereDate('inspection_date', $inspectionDate)
            ->max('reminder_date');

        if ($lastReminderDate === null) {
            return 'one_month';
        }

        return $today->greaterThanOrEqualTo(CarbonImmutable::parse($lastReminderDate)->addWeek()) ? 'weekly' : null;
    }

    private function alreadySentToday(Equipment $car, CarbonImmutable $inspectionDate, CarbonImmutable $today): bool
    {
        return EquipmentInspectionReminder::query()
            ->where('equipment_id', $car->id)
            ->whereDate('inspection_date', $inspectionDate)
            ->whereDate('reminder_date', $today)
            ->exists();
    }
}
