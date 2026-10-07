<?php

use App\Actions\Insurance\SendInsuranceExpiryReminders;
use App\Jobs\SendInsuranceExpiryReminderJob;
use App\Mail\InsuranceExpiryReminder;
use App\Models\ApplicationSetting;
use App\Models\InsurancePolicy;
use App\Models\InsurancePolicyReminder;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Queue;

uses(LazilyRefreshDatabase::class);

it('queues an insurance reminder and records delivery only after the job sends it', function () {
    Queue::fake([SendInsuranceExpiryReminderJob::class]);
    Mail::fake();
    ApplicationSetting::query()->create([
        'key' => 'reminder_recipients',
        'value' => ['insurance@example.test'],
    ]);
    $policy = InsurancePolicy::query()->create([
        'insurance_type' => 'equipment',
        'policy_number' => 'QUEUE-30-DAYS',
        'ends_on' => '2026-10-29',
    ]);

    $queued = app(SendInsuranceExpiryReminders::class)->sendForPolicy(
        $policy,
        CarbonImmutable::parse('2026-09-29'),
        withinThirtyDays: true,
    );

    expect($queued)->toBeTrue();
    Queue::assertPushed(SendInsuranceExpiryReminderJob::class, 1);
    Mail::assertNothingSent();
    $reminder = InsurancePolicyReminder::query()->sole();
    expect($reminder->queued_at)->not->toBeNull()
        ->and($reminder->sent_at)->toBeNull()
        ->and($reminder->attempts)->toBe(0);

    (new SendInsuranceExpiryReminderJob($reminder->id))->handle();

    Mail::assertSent(InsuranceExpiryReminder::class, 1);
    $reminder->refresh();
    expect($reminder->sent_at)->not->toBeNull()
        ->and($reminder->failed_at)->toBeNull()
        ->and($reminder->attempts)->toBe(1);
});

it('records a terminal reminder delivery failure without marking it sent', function () {
    $reminder = InsurancePolicyReminder::query()->create([
        'insurance_policy_id' => InsurancePolicy::query()->create([
            'insurance_type' => 'equipment',
            'policy_number' => 'FAILED-DELIVERY',
            'ends_on' => '2026-10-29',
        ])->id,
        'expiry_date' => '2026-10-29',
        'reminder_date' => '2026-09-29',
        'reminder_type' => '30_days',
        'queued_at' => now(),
    ]);
    ApplicationSetting::query()->create([
        'key' => 'reminder_recipients',
        'value' => ['insurance@example.test'],
    ]);
    Mail::shouldReceive('to')->once()->andThrow(new RuntimeException('SMTP is unavailable'));
    $job = new SendInsuranceExpiryReminderJob($reminder->id);

    expect(fn () => $job->handle())->toThrow(RuntimeException::class, 'SMTP is unavailable');
    $job->failed(new RuntimeException('SMTP is unavailable'));

    $reminder->refresh();
    expect($reminder->sent_at)->toBeNull()
        ->and($reminder->failed_at)->not->toBeNull()
        ->and($reminder->last_error)->toBe('SMTP is unavailable')
        ->and($reminder->attempts)->toBe(1);
});
