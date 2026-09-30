<?php

namespace App\Console\Commands;

use App\Actions\Insurance\SendInsuranceExpiryReminders as SendInsuranceExpiryRemindersAction;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class SendInsuranceExpiryReminders extends Command
{
    protected $signature = 'insurance:send-expiry-reminders {--date=}';
    protected $description = 'Send reminders 30, 14, 7, 1 and 0 days before insurance expiry';
    public function handle(SendInsuranceExpiryRemindersAction $action): int { $date = $this->option('date') ? CarbonImmutable::parse((string) $this->option('date')) : null; $this->info('Sent '.$action->handle($date).' insurance reminder(s).'); return self::SUCCESS; }
}
