<?php

use App\Actions\Insurance\SendInsuranceExpiryReminders;
use App\Mail\InsuranceExpiryReminder;
use App\Models\ApplicationSetting;
use App\Models\Employee;
use App\Models\InsurancePolicy;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class);

it('sends an insurance reminder exactly 30 days before expiry only once per day', function () {
    Mail::fake();
    Storage::fake('equipment-documents');
    ApplicationSetting::query()->create([
        'key' => 'reminder_recipients',
        'value' => ['insurance@example.test'],
    ]);
    $policy = InsurancePolicy::query()->create([
        'insurance_type' => 'equipment',
        'policy_number' => 'TEST-30-DAYS',
        'ends_on' => '2026-10-29',
    ]);
    $documentPath = "insurance/{$policy->id}/documents/policy.pdf";
    Storage::disk('equipment-documents')->put($documentPath, 'test policy document');
    $policy->documents()->create([
        'disk' => 'equipment-documents',
        'path' => $documentPath,
        'original_name' => 'Police TEST-30-DAYS.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => 20,
    ]);
    $today = CarbonImmutable::parse('2026-09-29');

    expect(app(SendInsuranceExpiryReminders::class)->sendForPolicy($policy, $today, withinThirtyDays: true))->toBeTrue();
    expect(app(SendInsuranceExpiryReminders::class)->sendForPolicy($policy, $today, withinThirtyDays: true))->toBeFalse();

    Mail::assertSent(InsuranceExpiryReminder::class, function (InsuranceExpiryReminder $mail) use ($policy, $documentPath): bool {
        $mail->assertHasSubject('Échéance assurance Équipements — Police TEST-30-DAYS');
        $mail->assertSeeInHtml('Numéro de police');
        $mail->assertSeeInHtml('TEST-30-DAYS');
        $mail->assertSeeInHtml('Équipements');
        $mail->assertHasAttachment(
            Attachment::fromStorageDisk('equipment-documents', $documentPath)
                ->as('Police TEST-30-DAYS.pdf')
                ->withMime('application/pdf'),
        );

        return $mail->policy->is($policy) && $mail->hasTo('insurance@example.test');
    });
    Mail::assertSent(InsuranceExpiryReminder::class, 1);
    $this->assertDatabaseHas('insurance_policy_reminders', [
        'insurance_policy_id' => $policy->id,
        'expiry_date' => '2026-10-29',
        'reminder_date' => '2026-09-29',
        'reminder_type' => '30_days',
    ]);
});

it('sends an immediate site reminder for any active expiry within the next 30 days', function () {
    Mail::fake();
    ApplicationSetting::query()->create([
        'key' => 'reminder_recipients',
        'value' => ['insurance@example.test'],
    ]);
    $policy = InsurancePolicy::query()->create([
        'insurance_type' => 'trc_rc',
        'policy_number' => 'TEST-14-DAYS',
        'ends_on' => '2026-10-13',
    ]);

    expect(app(SendInsuranceExpiryReminders::class)->sendForPolicy(
        $policy,
        CarbonImmutable::parse('2026-09-29'),
        withinThirtyDays: true,
    ))->toBeTrue();

    Mail::assertSent(InsuranceExpiryReminder::class, 1);
});

it('does not send the immediate site reminder more than 30 days before expiry', function () {
    Mail::fake();
    ApplicationSetting::query()->create([
        'key' => 'reminder_recipients',
        'value' => ['insurance@example.test'],
    ]);
    $policy = InsurancePolicy::query()->create([
        'insurance_type' => 'trc_rc',
        'policy_number' => 'TEST-31-DAYS',
        'ends_on' => '2026-10-30',
    ]);

    expect(app(SendInsuranceExpiryReminders::class)->sendForPolicy(
        $policy,
        CarbonImmutable::parse('2026-09-29'),
        withinThirtyDays: true,
    ))->toBeFalse();

    Mail::assertNothingSent();
});

it('resolves reminder recipients from the linked employee current email', function () {
    $employee = Employee::factory()->create(['email' => 'old-address@example.test']);
    ApplicationSetting::query()->create([
        'key' => 'reminder_recipient_employee_ids',
        'value' => [$employee->id],
    ]);

    expect(ApplicationSetting::reminderRecipients())->toBe(['old-address@example.test']);

    $employee->update(['email' => 'new-address@example.test']);

    expect(ApplicationSetting::reminderRecipients())->toBe(['new-address@example.test']);
    expect(ApplicationSetting::reminderRecipientEmployees()->first()->name)->toBe($employee->name);
});
