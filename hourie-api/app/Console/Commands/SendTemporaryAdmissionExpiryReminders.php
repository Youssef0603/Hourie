<?php

namespace App\Console\Commands;

use App\Actions\TemporaryAdmissions\SendTemporaryAdmissionExpiryReminders as SendTemporaryAdmissionExpiryRemindersAction;
use App\Models\TemporaryAdmission;
use Carbon\CarbonImmutable;
use Illuminate\Console\Command;

class SendTemporaryAdmissionExpiryReminders extends Command
{
    protected $signature = 'temporary-admissions:send-expiry-reminders
                            {--date= : Date used for the reminder check (YYYY-MM-DD)}
                            {--admission= : Send for one admission ID}
                            {--force : Send a settings-recipient test outside the normal 30-day date}';

    protected $description = 'Send AT reminders 30 days before expiry, then weekly until renewal or closure';

    public function handle(SendTemporaryAdmissionExpiryRemindersAction $action): int
    {
        $today = $this->option('date')
            ? CarbonImmutable::parse((string) $this->option('date'))
            : CarbonImmutable::today();

        if ($this->option('admission')) {
            $admission = TemporaryAdmission::query()->findOrFail((int) $this->option('admission'));
            $sent = $action->sendForAdmission($admission, $today, (bool) $this->option('force')) ? 1 : 0;
        } else {
            $sent = $action->handle($today);
        }

        $this->info("Queued {$sent} temporary admission reminder(s).");

        return self::SUCCESS;
    }
}
