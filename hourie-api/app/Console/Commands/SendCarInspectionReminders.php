<?php

namespace App\Console\Commands;

use App\Actions\Equipment\SendCarInspectionReminder;
use App\Models\Equipment;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class SendCarInspectionReminders extends Command
{
    protected $signature = 'equipment:send-inspection-reminders
                            {--date= : Date used for the reminder check (YYYY-MM-DD)}
                            {--to=* : Email address to use instead of the normal recipients}
                            {--equipment= : Asset code for one car only}
                            {--force : Send immediately, ignoring the normal reminder timing}';

    protected $description = 'Send inspection reminders one month before and weekly until the car visit date changes';

    public function handle(SendCarInspectionReminder $sendCarInspectionReminder): int
    {
        $today = $this->option('date') === null
            ? CarbonImmutable::today()
            : CarbonImmutable::createFromFormat('Y-m-d', (string) $this->option('date'))->startOfDay();
        $recipients = collect($this->option('to'))
            ->filter(fn (mixed $email): bool => filter_var($email, FILTER_VALIDATE_EMAIL) !== false)
            ->values();

        if ($recipients->isEmpty()) {
            $recipients = $sendCarInspectionReminder->recipients();
        }

        if ($recipients->isEmpty()) {
            $this->warn('No equipment manager email address is configured.');

            return self::SUCCESS;
        }

        $cars = Equipment::query()
            ->where('is_active', true)
            ->whereHas('category', fn ($query) => $query->where('code', 'car'))
            ->whereNotNull('asset_details->inspection_date')
            ->when($this->option('equipment'), fn ($query, string $assetCode) => $query->where('asset_code', $assetCode))
            ->get();
        $sent = 0;

        foreach ($cars as $car) {
            $sent += $sendCarInspectionReminder->handle($car, $today, $recipients, (bool) $this->option('force')) ? 1 : 0;
        }

        $this->info("Sent {$sent} car inspection reminder(s).");

        return self::SUCCESS;
    }
}
