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
                            {--equipment= : Asset code for one car only}
                            {--force : Send immediately, ignoring the normal reminder timing}';

    protected $description = 'Send inspection reminders one month before and weekly until the car visit date changes';

    public function handle(SendCarInspectionReminder $sendCarInspectionReminder): int
    {
        $today = $this->option('date') === null
            ? CarbonImmutable::today()
            : CarbonImmutable::createFromFormat('Y-m-d', (string) $this->option('date'))->startOfDay();
        if ($sendCarInspectionReminder->recipients()->isEmpty()) {
            $this->warn('No equipment manager email address is configured.');

            return self::SUCCESS;
        }

        $cars = Equipment::query()
            ->where('is_active', true)
            ->whereHas('category', fn ($query) => $query->where('code', 'car'))
            ->whereNotNull('asset_details->inspection_date')
            ->with('category')
            ->when($this->option('equipment'), fn ($query, string $assetCode) => $query->where('asset_code', $assetCode))
            ->lazyById();
        $sent = 0;

        foreach ($cars as $car) {
            $sent += $sendCarInspectionReminder->handle($car, $today, (bool) $this->option('force')) ? 1 : 0;
        }

        $this->info("Queued {$sent} car inspection reminder(s).");

        return self::SUCCESS;
    }
}
