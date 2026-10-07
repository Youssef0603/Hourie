<?php

namespace App\Actions\Bonds;

use App\Jobs\SendBondExpiryReminderJob;
use App\Models\ApplicationSetting;
use App\Models\Bond;
use App\Models\BondReminder;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class SendBondExpiryReminders
{
    private const REMINDER_DAYS = [30, 14, 7, 1, 0];

    public function handle(?CarbonImmutable $today = null): int
    {
        $today ??= CarbonImmutable::today();
        $sent = 0;

        foreach (Bond::query()
            ->whereNotNull('expires_on')
            ->whereDate('expires_on', '>=', $today)
            ->lazyById() as $bond) {
            if ($this->sendForBond($bond, $today)) {
                $sent++;
            }
        }

        return $sent;
    }

    public function sendForBond(Bond $bond, ?CarbonImmutable $today = null, bool $withinThirtyDays = false): bool
    {
        $today ??= CarbonImmutable::today();
        if ($bond->expires_on === null) {
            return false;
        }

        $days = (int) $today->diffInDays($bond->expires_on, false);
        if ($withinThirtyDays ? ($days < 0 || $days > 30) : ! in_array($days, self::REMINDER_DAYS, true)) {
            return false;
        }

        if (ApplicationSetting::reminderRecipients() === []) {
            return false;
        }

        $reminder = DB::transaction(function () use ($bond, $days, $today): BondReminder {
            $reminder = BondReminder::query()->firstOrCreate([
                'bond_id' => $bond->id,
                'expiry_date' => $bond->expires_on->toDateString(),
                'reminder_date' => $today->toDateString(),
            ], [
                'reminder_type' => $days === 0 ? 'expiry' : "{$days}_days",
                'queued_at' => now(),
            ]);

            if ($reminder->wasRecentlyCreated) {
                SendBondExpiryReminderJob::dispatch($reminder->id)->afterCommit();
            }

            return $reminder;
        });

        return $reminder->wasRecentlyCreated;
    }
}
