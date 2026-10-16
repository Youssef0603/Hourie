<?php

namespace App\Console\Commands;

use App\Actions\Insurance\SendInsuranceExpiryReminders as SendInsuranceExpiryRemindersAction;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class SendInsuranceExpiryReminders extends Command
{
    protected $signature = 'insurance:send-expiry-reminders {--date=}';

    protected $description = 'Send insurance reminders one month before expiry, then weekly through the expiry date';

    public function handle(SendInsuranceExpiryRemindersAction $action): int
    {
        $date = $this->option('date') ? CarbonImmutable::parse((string) $this->option('date')) : null;
        $this->info('Queued '.$action->handle($date).' insurance reminder(s).');

        return self::SUCCESS;
    }
}
