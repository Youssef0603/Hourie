<?php

namespace App\Actions\TemporaryAdmissions;

use App\Jobs\SendTemporaryAdmissionExpiryReminderJob;
use App\Models\ApplicationSetting;
use App\Models\TemporaryAdmission;
use App\Models\TemporaryAdmissionReminder;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class SendTemporaryAdmissionExpiryReminders
{
    public function handle(?CarbonImmutable $today = null): int
    {
        $today ??= CarbonImmutable::today();
        $sent = 0;

        foreach (TemporaryAdmission::query()
            ->whereNotIn('status', ['returned', 'cleared'])
            ->whereNotNull('entered_on')
            ->with('documents:id,temporary_admission_id,document_type')
            ->lazyById() as $admission) {
            if ($this->sendForAdmission($admission, $today)) {
                $sent++;
            }
        }

        return $sent;
    }

    public function sendForAdmission(
        TemporaryAdmission $admission,
        ?CarbonImmutable $today = null,
        bool $force = false,
    ): bool {
        $today ??= CarbonImmutable::today();
        $admission->loadMissing(['documents', 'equipment']);

        if (in_array($admission->status, ['returned', 'cleared'], true)) {
            return false;
        }

        $expiresOn = $admission->expiresOn();
        if ($expiresOn === null) {
            return false;
        }

        $days = (int) $today->diffInDays($expiresOn, false);
        $lastReminderDate = TemporaryAdmissionReminder::query()
            ->where('temporary_admission_id', $admission->id)
            ->whereDate('expiry_date', $expiresOn)
            ->max('reminder_date');

        if (! $force) {
            if ($today->isBefore($expiresOn->subDays(30))) {
                return false;
            }
            if ($lastReminderDate !== null && $today->isBefore(CarbonImmutable::parse($lastReminderDate)->addWeek())) {
                return false;
            }
        }

        if (ApplicationSetting::reminderRecipients() === []) {
            return false;
        }

        $reminder = DB::transaction(function () use ($admission, $days, $expiresOn, $force, $lastReminderDate, $today): TemporaryAdmissionReminder {
            $reminder = TemporaryAdmissionReminder::query()->firstOrCreate([
                'temporary_admission_id' => $admission->id,
                'expiry_date' => $expiresOn->toDateString(),
                'reminder_date' => $today->toDateString(),
            ], [
                'reminder_type' => $this->reminderType($days, $force, $lastReminderDate !== null),
                'queued_at' => now(),
            ]);

            if ($reminder->wasRecentlyCreated) {
                SendTemporaryAdmissionExpiryReminderJob::dispatch($reminder->id)->afterCommit();
            }

            return $reminder;
        });

        return $reminder->wasRecentlyCreated;
    }

    private function reminderType(int $days, bool $force, bool $hasPreviousReminder): string
    {
        if ($force) {
            return 'manual_test';
        }
        if ($days < 0) {
            return 'overdue_weekly';
        }
        if ($days === 0) {
            return 'expiry';
        }

        return $hasPreviousReminder ? 'weekly' : '30_days';
    }
}
