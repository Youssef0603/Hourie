<?php

namespace App\Actions\Insurance;

use App\Mail\InsuranceExpiryReminder;
use App\Models\ApplicationSetting;
use App\Models\InsurancePolicy;
use App\Models\InsurancePolicyReminder;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Mail;

class SendInsuranceExpiryReminders
{
    private const REMINDER_DAYS = [30, 14, 7, 1, 0];

    public function handle(?CarbonImmutable $today = null): int
    {
        $today ??= CarbonImmutable::today();
        $sent = 0;

        foreach (InsurancePolicy::query()->whereNotNull('ends_on')->whereDate('ends_on', '>=', $today)->get() as $policy) {
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

        // Carbon 3 returns a float from diffInDays. Normalize it before the strict milestone check.
        $days = (int) $today->diffInDays($policy->ends_on, false);
        if ($withinThirtyDays ? ($days < 0 || $days > 30) : ! in_array($days, self::REMINDER_DAYS, true)) {
            return false;
        }

        $recipients = ApplicationSetting::reminderRecipients();
        if ($recipients === [] || InsurancePolicyReminder::query()
            ->where('insurance_policy_id', $policy->id)
            ->whereDate('expiry_date', $policy->ends_on)
            ->whereDate('reminder_date', $today)
            ->exists()) {
            return false;
        }

        Mail::to($recipients)->send(new InsuranceExpiryReminder($policy));
        InsurancePolicyReminder::query()->create([
            'insurance_policy_id' => $policy->id,
            'expiry_date' => $policy->ends_on->toDateString(),
            'reminder_date' => $today->toDateString(),
            'reminder_type' => $days === 0 ? 'expiry' : "{$days}_days",
            'sent_at' => now(),
        ]);

        return true;
    }
}
