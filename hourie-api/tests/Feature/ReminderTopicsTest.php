<?php

use App\Actions\Insurance\SendInsuranceExpiryReminders;
use App\Enums\UserRole;
use App\Jobs\SendInsuranceExpiryReminderJob;
use App\Mail\InsuranceExpiryReminder;
use App\Models\ApplicationSetting;
use App\Models\Employee;
use App\Models\InsurancePolicy;
use App\Models\InsurancePolicyReminder;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;

uses(LazilyRefreshDatabase::class);

beforeEach(function (): void {
    $this->insuranceOnly = Employee::factory()->create(['email' => 'assurances@example.test', 'is_active' => true]);
    $this->admissionsOnly = Employee::factory()->create(['email' => 'at@example.test', 'is_active' => true]);
});

it('saves which kinds of reminder each recipient receives', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);

    $this->actingAs($manager, 'web')->putJson('/api/v1/notification-settings', ['recipients' => [
        ['employee_id' => $this->insuranceOnly->id, 'topics' => ['insurance', 'bond']],
        ['employee_id' => $this->admissionsOnly->id, 'topics' => ['temporary_admission']],
    ]])
        ->assertOk()
        ->assertJsonPath('data.recipients.0.topics', ['insurance', 'bond'])
        ->assertJsonPath('data.recipients.1.topics', ['temporary_admission']);

    expect(ApplicationSetting::reminderRecipients(topic: 'insurance'))->toBe(['assurances@example.test'])
        ->and(ApplicationSetting::reminderRecipients(topic: 'temporary_admission'))->toBe(['at@example.test'])
        ->and(ApplicationSetting::reminderRecipients(topic: 'car_inspection'))->toBe([]);
});

it('lets several people receive the same kinds of reminder', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);

    $this->actingAs($manager, 'web')->putJson('/api/v1/notification-settings', ['recipients' => [
        ['employee_id' => $this->insuranceOnly->id, 'topics' => ApplicationSetting::REMINDER_TOPICS],
        ['employee_id' => $this->admissionsOnly->id, 'topics' => ApplicationSetting::REMINDER_TOPICS],
    ]])->assertOk()->assertJsonCount(2, 'data.recipients');

    expect(ApplicationSetting::reminderRecipients(topic: 'insurance'))->toBe(['assurances@example.test', 'at@example.test']);
});

it('rejects an unknown kind of reminder', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);

    $this->actingAs($manager, 'web')->putJson('/api/v1/notification-settings', ['recipients' => [
        ['employee_id' => $this->insuranceOnly->id, 'topics' => ['salaries']],
    ]])->assertUnprocessable()->assertJsonValidationErrors('recipients.0.topics.0');
});

it('keeps sending every kind to recipients saved before kinds existed', function () {
    ApplicationSetting::query()->create(['key' => 'reminder_recipient_employee_ids', 'value' => [$this->insuranceOnly->id]]);

    foreach (ApplicationSetting::REMINDER_TOPICS as $topic) {
        expect(ApplicationSetting::reminderRecipients(topic: $topic))->toBe(['assurances@example.test']);
    }
});

it('sends an insurance reminder only to the people who receive insurance reminders', function () {
    Mail::fake();
    ApplicationSetting::query()->create(['key' => 'reminder_recipient_employee_ids', 'value' => [$this->insuranceOnly->id, $this->admissionsOnly->id]]);
    ApplicationSetting::query()->create(['key' => 'reminder_recipient_topics', 'value' => [
        (string) $this->insuranceOnly->id => ['insurance'],
        (string) $this->admissionsOnly->id => ['temporary_admission'],
    ]]);
    $policy = InsurancePolicy::query()->create(['insurance_type' => 'equipment', 'policy_number' => 'TOPIC-1', 'ends_on' => '2026-12-31']);
    $reminder = InsurancePolicyReminder::query()->create([
        'insurance_policy_id' => $policy->id,
        'expiry_date' => '2026-12-31',
        'reminder_date' => '2026-12-01',
        'reminder_type' => 'one_month',
        'queued_at' => now(),
    ]);

    (new SendInsuranceExpiryReminderJob($reminder->id))->handle();

    Mail::assertSent(InsuranceExpiryReminder::class, fn (InsuranceExpiryReminder $mail): bool => $mail->hasTo('assurances@example.test') && ! $mail->hasTo('at@example.test'));
});

it('does not queue a reminder when nobody receives that kind', function () {
    Queue::fake([SendInsuranceExpiryReminderJob::class]);
    ApplicationSetting::query()->create(['key' => 'reminder_recipient_employee_ids', 'value' => [$this->admissionsOnly->id]]);
    ApplicationSetting::query()->create(['key' => 'reminder_recipient_topics', 'value' => [(string) $this->admissionsOnly->id => ['temporary_admission']]]);
    $policy = InsurancePolicy::query()->create(['insurance_type' => 'equipment', 'policy_number' => 'TOPIC-2', 'ends_on' => now()->addDays(30)->toDateString()]);

    expect(app(SendInsuranceExpiryReminders::class)->sendForPolicy($policy, withinThirtyDays: true))->toBeFalse();
    Queue::assertNothingPushed();
});
