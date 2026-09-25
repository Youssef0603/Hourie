<?php

namespace App\Actions\Equipment;

use App\Mail\CarInspectionReminder;
use App\Models\Equipment;
use App\Models\EquipmentInspectionReminder;
use Carbon\CarbonImmutable;
use Carbon\Exceptions\InvalidFormatException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendCarInspectionReminder
{
    /** @param Collection<int, string>|null $recipients */
    public function handle(Equipment $car, ?CarbonImmutable $today = null, ?Collection $recipients = null, bool $force = false): bool
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

        $recipients ??= $this->recipients();
        if ($recipients->isEmpty()) {
            return false;
        }

        try {
            Mail::to($recipients->all())->send(new CarInspectionReminder($car));
        } catch (Throwable $exception) {
            Log::warning('Unable to send car inspection reminder.', [
                'equipment_id' => $car->id,
                'asset_code' => $car->asset_code,
                'exception' => $exception->getMessage(),
            ]);

            return false;
        }

        if (! $force) {
            EquipmentInspectionReminder::query()->create([
                'equipment_id' => $car->id,
                'inspection_date' => $inspectionDate->toDateString(),
                'reminder_date' => $today->toDateString(),
                'reminder_type' => $reminderType,
                'sent_at' => now(),
            ]);
        }

        return true;
    }

    /** @return Collection<int, string> */
    public function recipients(): Collection
    {
        return collect(config('mail.inspection_reminder_recipients', []))
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
