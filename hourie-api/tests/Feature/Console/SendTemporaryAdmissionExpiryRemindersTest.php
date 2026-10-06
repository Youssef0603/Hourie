<?php

use App\Actions\TemporaryAdmissions\SendTemporaryAdmissionExpiryReminders;
use App\Mail\TemporaryAdmissionExpiryReminder;
use App\Models\ApplicationSetting;
use App\Models\Employee;
use App\Models\TemporaryAdmission;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class);

it('sends an AT reminder 30 days before its anniversary expiry only to settings recipients', function () {
    Mail::fake();
    Storage::fake('equipment-documents');
    $recipient = Employee::factory()->create(['email' => 'finance@example.test', 'is_active' => true]);
    Employee::factory()->create(['email' => 'excluded@example.test', 'is_active' => true]);
    ApplicationSetting::query()->create([
        'key' => 'reminder_recipient_employee_ids',
        'value' => [$recipient->id],
    ]);
    $admission = TemporaryAdmission::query()->create([
        'customs_reference' => 'S1445',
        'entered_on' => '2021-10-12',
        'status' => 'renewed',
    ]);
    $admission->documents()->create([
        'document_type' => 'renewal',
        'document_date' => '2022-10-08',
        'disk' => 'equipment-documents',
        'path' => "temporary-admissions/{$admission->id}/renewal.pdf",
        'original_name' => 'Renouvellement S1445.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => 18,
    ]);
    Storage::disk('equipment-documents')->put(
        "temporary-admissions/{$admission->id}/renewal.pdf",
        'renewal document',
    );
    $today = CarbonImmutable::parse('2023-09-12');

    expect(app(SendTemporaryAdmissionExpiryReminders::class)->sendForAdmission($admission, $today))->toBeTrue();
    expect(app(SendTemporaryAdmissionExpiryReminders::class)->sendForAdmission($admission, $today))->toBeFalse();

    Mail::assertSent(TemporaryAdmissionExpiryReminder::class, function (TemporaryAdmissionExpiryReminder $mail) use ($admission): bool {
        $mail->assertHasSubject('Échéance admission temporaire — S1445');
        $mail->assertSeeInHtml('S1445');
        $mail->assertSeeInHtml('12 octobre 2023');
        $mail->assertHasAttachment(
            Attachment::fromStorageDisk(
                'equipment-documents',
                "temporary-admissions/{$admission->id}/renewal.pdf",
            )->as('Renouvellement S1445.pdf')->withMime('application/pdf'),
        );

        return $mail->hasTo('finance@example.test') && ! $mail->hasTo('excluded@example.test');
    });
    Mail::assertSent(TemporaryAdmissionExpiryReminder::class, 1);
    $this->assertDatabaseHas('temporary_admission_reminders', [
        'temporary_admission_id' => $admission->id,
        'expiry_date' => '2023-10-12',
        'reminder_date' => '2023-09-12',
        'reminder_type' => '30_days',
    ]);
});

it('does not remind for an AT that has been returned', function () {
    Mail::fake();
    ApplicationSetting::query()->create(['key' => 'reminder_recipients', 'value' => ['finance@example.test']]);
    $admission = TemporaryAdmission::query()->create([
        'customs_reference' => 'S2000',
        'entered_on' => '2025-11-05',
        'status' => 'returned',
        'returned_on' => '2026-09-01',
    ]);

    expect(app(SendTemporaryAdmissionExpiryReminders::class)->sendForAdmission(
        $admission,
        CarbonImmutable::parse('2026-10-06'),
    ))->toBeFalse();
    Mail::assertNothingSent();
});

it('repeats weekly before and after expiry until a renewal changes the expiry', function () {
    Mail::fake();
    ApplicationSetting::query()->create(['key' => 'reminder_recipients', 'value' => ['finance@example.test']]);
    $admission = TemporaryAdmission::query()->create([
        'customs_reference' => 'S3000',
        'entered_on' => '2025-11-05',
        'status' => 'active',
    ]);
    $action = app(SendTemporaryAdmissionExpiryReminders::class);

    expect($action->sendForAdmission($admission, CarbonImmutable::parse('2026-10-06')))->toBeTrue()
        ->and($action->sendForAdmission($admission, CarbonImmutable::parse('2026-10-12')))->toBeFalse()
        ->and($action->sendForAdmission($admission, CarbonImmutable::parse('2026-10-13')))->toBeTrue()
        ->and($action->sendForAdmission($admission, CarbonImmutable::parse('2026-11-06')))->toBeTrue();

    $this->assertDatabaseHas('temporary_admission_reminders', [
        'temporary_admission_id' => $admission->id,
        'expiry_date' => '2026-11-05',
        'reminder_date' => '2026-10-13',
        'reminder_type' => 'weekly',
    ]);
    $this->assertDatabaseHas('temporary_admission_reminders', [
        'temporary_admission_id' => $admission->id,
        'expiry_date' => '2026-11-05',
        'reminder_date' => '2026-11-06',
        'reminder_type' => 'overdue_weekly',
    ]);

    $admission->documents()->create([
        'document_type' => 'renewal',
        'document_date' => '2026-11-07',
        'disk' => 'equipment-documents',
        'path' => "temporary-admissions/{$admission->id}/renewal-2026.pdf",
        'original_name' => 'Renouvellement 2026.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => 18,
    ]);
    $admission->unsetRelation('documents');

    expect($action->sendForAdmission($admission, CarbonImmutable::parse('2026-11-13')))->toBeFalse();
    Mail::assertSent(TemporaryAdmissionExpiryReminder::class, 3);
});
