<?php

namespace App\Console\Commands;

use App\Actions\Bonds\SendBondExpiryReminders as SendBondExpiryRemindersAction;
use Carbon\CarbonImmutable;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('bonds:send-expiry-reminders {--date=}')]
#[Description('Send reminders 30, 14, 7, 1 and 0 days before bond expiry')]
class SendBondExpiryReminders extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(SendBondExpiryRemindersAction $action): int
    {
        $date = $this->option('date') ? CarbonImmutable::parse((string) $this->option('date')) : null;
        $this->info('Queued '.$action->handle($date).' bond reminder(s).');

        return self::SUCCESS;
    }
}
