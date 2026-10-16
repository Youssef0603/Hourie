<?php

namespace App\Actions\Insurance;

use App\Jobs\SendInsuranceExpiryReminderJob;
use App\Models\ApplicationSetting;
use App\Models\InsurancePolicy;
use App\Models\InsurancePolicyReminder;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;

class SendInsuranceExpiryReminders
{
    public function handle(?CarbonImmutable $today = null): int
    {
        $today ??= CarbonImmutable::today();
        $sent = 0;

        foreach (InsurancePolicy::query()
            ->whereNotNull('ends_on')
            ->whereDate('ends_on', '>=', $today)
            ->lazyById() as $policy) {
            if ($this->sendForPolicy($policy, $today)) {
                $sent++;
            }
        }

        return $sent;
    }

    public function sendForPolicy(InsurancePolicy $policy, ?CarbonImmutable $today = null, bool $withinThirtyDays = false): bool
    {
        $today ??= CarbonImmutable::today();
        if ($policy->ends_on === null) {
            return false;
        }

        $days = (int) $today->diffInDays($policy->ends_on, false);
        if ($withinThirtyDays) {
            if ($days < 0 || $days > 30) {
                return false;
            }
        } elseif ($today->isAfter($policy->ends_on)
            || $today->isBefore(CarbonImmutable::parse($policy->ends_on)->subMonthNoOverflow())) {
            return false;
        }

        $lastReminderDate = InsurancePolicyReminder::query()
            ->where('insurance_policy_id', $policy->id)
            ->whereDate('expiry_date', $policy->ends_on)
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

        $reminder = DB::transaction(function () use ($days, $lastReminderDate, $policy, $today): InsurancePolicyReminder {
            $reminder = InsurancePolicyReminder::query()->firstOrCreate([
                'insurance_policy_id' => $policy->id,
                'expiry_date' => $policy->ends_on->toDateString(),
                'reminder_date' => $today->toDateString(),
            ], [
                'reminder_type' => $days === 0
                    ? 'expiry'
                    : ($lastReminderDate === null ? 'one_month' : 'weekly'),
                'queued_at' => now(),
            ]);

            if ($reminder->wasRecentlyCreated) {
                SendInsuranceExpiryReminderJob::dispatch($reminder->id)->afterCommit();
            }

            return $reminder;
        });

        return $reminder->wasRecentlyCreated;
    }
}
