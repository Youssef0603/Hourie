<?php

use App\Actions\Bonds\SendBondExpiryReminders;
use App\Mail\BondExpiryReminder;
use App\Models\ApplicationSetting;
use App\Models\Bond;
use App\Models\Location;
use App\Models\Project;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class);

it('sends a bond reminder 30 days before expiry with its documents only once per day', function () {
    Mail::fake();
    Storage::fake('equipment-documents');
    ApplicationSetting::query()->create(['key' => 'reminder_recipients', 'value' => ['finance@example.test']]);
    $site = Project::factory()->create(['name' => 'Bassam']);
    $root = Location::factory()->for($site)->create(['parent_id' => null, 'location_type' => 'project_site']);
    $location = Location::factory()->for($site)->for($root, 'parent')->create(['name' => 'Lot 1', 'location_type' => 'project_area']);
    $bond = Bond::query()->create([
        'project_id' => $site->id,
        'location_id' => $location->id,
        'bond_type' => 'advance_payment',
        'issuer' => 'SGCI',
        'amount' => 1000000,
        'currency' => 'XOF',
        'issued_on' => '2026-01-01',
        'expires_on' => '2026-10-30',
    ]);
    $documentPath = "bonds/{$bond->id}/documents/caution.pdf";
    Storage::disk('equipment-documents')->put($documentPath, 'test bond document');
    $bond->documents()->create([
        'disk' => 'equipment-documents',
        'path' => $documentPath,
        'original_name' => 'Caution Bassam.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => 18,
    ]);
    $today = CarbonImmutable::parse('2026-09-30');

    expect(app(SendBondExpiryReminders::class)->sendForBond($bond, $today))->toBeTrue();
    expect(app(SendBondExpiryReminders::class)->sendForBond($bond, $today))->toBeFalse();

    Mail::assertSent(BondExpiryReminder::class, function (BondExpiryReminder $mail) use ($bond, $documentPath): bool {
        $mail->assertHasSubject('Échéance Avance de démarrage — Bassam');
        $mail->assertSeeInHtml('Bassam');
        $mail->assertSeeInHtml('Lot 1');
        $mail->assertSeeInHtml('SGCI');
        $mail->assertHasAttachment(
            Attachment::fromStorageDisk('equipment-documents', $documentPath)
                ->as('Caution Bassam.pdf')
                ->withMime('application/pdf'),
        );

        return $mail->bond->is($bond) && $mail->hasTo('finance@example.test');
    });
    Mail::assertSent(BondExpiryReminder::class, 1);
    $this->assertDatabaseHas('bond_reminders', [
        'bond_id' => $bond->id,
        'expiry_date' => '2026-10-30',
        'reminder_date' => '2026-09-30',
        'reminder_type' => '30_days',
    ]);
});

it('can send immediately after a site update when expiry is within 30 days', function () {
    Mail::fake();
    ApplicationSetting::query()->create(['key' => 'reminder_recipients', 'value' => ['finance@example.test']]);
    $bond = Bond::query()->create([
        'project_id' => Project::factory()->create()->id,
        'bond_type' => 'performance',
        'amount' => 1000,
        'currency' => 'XOF',
        'expires_on' => '2026-10-14',
    ]);

    expect(app(SendBondExpiryReminders::class)->sendForBond(
        $bond,
        CarbonImmutable::parse('2026-09-30'),
        withinThirtyDays: true,
    ))->toBeTrue();

    Mail::assertSent(BondExpiryReminder::class, 1);
});
