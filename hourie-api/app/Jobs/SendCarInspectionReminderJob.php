<?php

namespace App\Jobs;

use App\Mail\CarInspectionReminder;
use App\Models\ApplicationSetting;
use App\Models\EquipmentInspectionReminder;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendCarInspectionReminderJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public array $backoff = [60, 300, 900];

    public int $timeout = 120;

    public int $uniqueFor = 900;

    public function __construct(public readonly int $reminderId) {}

    public function uniqueId(): string
    {
        return (string) $this->reminderId;
    }

    public function handle(): void
    {
        $reminder = EquipmentInspectionReminder::query()->with('equipment')->find($this->reminderId);
        if ($reminder === null || $reminder->sent_at !== null) {
            return;
        }

        $recipients = ApplicationSetting::reminderRecipients();
        if ($recipients === []) {
            throw new \RuntimeException('No reminder recipients are configured.');
        }

        $reminder->increment('attempts');
        Mail::to($recipients)->send(new CarInspectionReminder($reminder->equipment));
        $reminder->update(['sent_at' => now(), 'failed_at' => null, 'last_error' => null]);
    }

    public function failed(?Throwable $exception): void
    {
        EquipmentInspectionReminder::query()->whereKey($this->reminderId)->update([
            'failed_at' => now(),
            'last_error' => $exception?->getMessage(),
        ]);
    }
}
