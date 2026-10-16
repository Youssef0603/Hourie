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
        if ($withinThirtyDays) {
            if ($days < 0 || $days > 30) {
                return false;
            }
        } elseif ($today->isAfter($bond->expires_on)
            || $today->isBefore(CarbonImmutable::parse($bond->expires_on)->subMonthNoOverflow())) {
            return false;
        }

        $lastReminderDate = BondReminder::query()
            ->where('bond_id', $bond->id)
            ->whereDate('expiry_date', $bond->expires_on)
            ->max('reminder_date');

        if (! $withinThirtyDays
            && $days !== 0
            && $lastReminderDate !== null
            && $today->isBefore(CarbonImmutable::parse($lastReminderDate)->addWeek())) {
            return false;
        }

        if (ApplicationSetting::reminderRecipients() === []) {
            return false;
        }

        $reminder = DB::transaction(function () use ($bond, $days, $lastReminderDate, $today): BondReminder {
            $reminder = BondReminder::query()->firstOrCreate([
                'bond_id' => $bond->id,
                'expiry_date' => $bond->expires_on->toDateString(),
                'reminder_date' => $today->toDateString(),
            ], [
                'reminder_type' => $days === 0
                    ? 'expiry'
                    : ($lastReminderDate === null ? 'one_month' : 'weekly'),
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
