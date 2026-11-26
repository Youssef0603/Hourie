<?php

use App\Mail\BondExpiryReminder;
use App\Mail\CarInspectionReminder;
use App\Mail\InsuranceExpiryReminder;
use App\Mail\TemporaryAdmissionExpiryReminder;
use App\Models\ApplicationSetting;
use App\Models\Bond;
use App\Models\Employee;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\InsurancePolicy;
use App\Models\Project;
use App\Models\TemporaryAdmission;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Mail;

uses(LazilyRefreshDatabase::class);

/**
 * Walks day by day through the month before a deadline, running the real
 * scheduled command each morning, and returns the day and recipients of
 * every reminder sent.
 *
 * @return list<array{day: string, to: list<string>}>
 */
function simulateReminders(string $command, string $mailable, string $deadline): array
{
    $sent = [];
    $seen = 0;
    $day = CarbonImmutable::parse($deadline)->subDays(40);
    $end = CarbonImmutable::parse($deadline)->addDays(5);

    while ($day->lessThanOrEqualTo($end)) {
        test()->travelTo($day->setTime(8, 0));
        Artisan::call($command);

        $mails = Mail::sent($mailable)->values();
        foreach ($mails->slice($seen) as $mail) {
            $sent[] = ['day' => $day->toDateString(), 'to' => collect($mail->to)->pluck('address')->sort()->values()->all()];
        }
        $seen = $mails->count();
        $day = $day->addDay();
    }

    return $sent;
}

beforeEach(function (): void {
    Mail::fake();
    $standard = Employee::factory()->create(['name' => 'Liste standard', 'email' => 'standard@hourie.test', 'is_active' => true]);
    Employee::factory()->create(['name' => 'Directeur', 'email' => 'dg@hourie.test', 'job_title' => 'general_manager', 'is_active' => true]);
    ApplicationSetting::query()->create(['key' => 'reminder_recipient_employee_ids', 'value' => [$standard->id]]);
});

/**
 * One month before, then every week, then on the day itself; the
 * Directeur général joins from the 4th reminder.
 */
$expected = [
    ['day' => '2026-11-30', 'to' => ['standard@hourie.test']],
    ['day' => '2026-12-07', 'to' => ['standard@hourie.test']],
    ['day' => '2026-12-14', 'to' => ['standard@hourie.test']],
    ['day' => '2026-12-21', 'to' => ['dg@hourie.test', 'standard@hourie.test']],
    ['day' => '2026-12-28', 'to' => ['dg@hourie.test', 'standard@hourie.test']],
    ['day' => '2026-12-31', 'to' => ['dg@hourie.test', 'standard@hourie.test']],
];

it('sends insurance expiry reminders on schedule, escalating to the Directeur général', function () use ($expected) {
    InsurancePolicy::query()->create(['insurance_type' => 'equipment', 'policy_number' => 'SIM-INS', 'ends_on' => '2026-12-31']);

    expect(simulateReminders('insurance:send-expiry-reminders', InsuranceExpiryReminder::class, '2026-12-31'))->toBe($expected);
});

it('sends bond expiry reminders on schedule, escalating to the Directeur général', function () use ($expected) {
    Bond::query()->create(['project_id' => Project::factory()->create()->id, 'bond_type' => 'performance', 'amount' => 1000, 'currency' => 'XOF', 'expires_on' => '2026-12-31']);

    expect(simulateReminders('bonds:send-expiry-reminders', BondExpiryReminder::class, '2026-12-31'))->toBe($expected);
});

it('sends temporary admission reminders on schedule, escalating to the Directeur général', function () use ($expected) {
    // Without renewal, an admission expires 12 months after entry.
    TemporaryAdmission::query()->create(['customs_reference' => 'SIM-AT', 'entered_on' => '2025-12-31', 'created_by_user_id' => User::factory()->create()->id]);

    expect(simulateReminders('temporary-admissions:send-expiry-reminders', TemporaryAdmissionExpiryReminder::class, '2026-12-31'))->toBe($expected);
});

it('sends car inspection reminders on schedule, escalating to the Directeur général', function () use ($expected) {
    $cars = EquipmentCategory::query()->firstOrCreate(['code' => 'car'], ['name' => 'Voitures']);
    Equipment::factory()->create(['equipment_category_id' => $cars->id, 'is_active' => true, 'asset_details' => ['inspection_date' => '2026-12-31']]);

    expect(simulateReminders('equipment:send-inspection-reminders', CarInspectionReminder::class, '2026-12-31'))->toBe($expected);
});

it('sends nothing when the standard list is empty, not even to the Directeur général', function () {
    ApplicationSetting::query()->where('key', 'reminder_recipient_employee_ids')->update(['value' => []]);
    InsurancePolicy::query()->create(['insurance_type' => 'equipment', 'policy_number' => 'SIM-EMPTY', 'ends_on' => '2026-12-31']);

    expect(simulateReminders('insurance:send-expiry-reminders', InsuranceExpiryReminder::class, '2026-12-31'))->toBe([]);
});
