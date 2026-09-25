<?php

use App\Actions\Equipment\SendCarInspectionReminder;
use App\Console\Commands\SendCarInspectionReminders;
use App\Enums\UserRole;
use App\Mail\CarInspectionReminder;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\EquipmentInspectionReminder;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(LazilyRefreshDatabase::class);

it('sends the first reminder immediately when a car visit date is within the next month', function () {
    Mail::fake();
    $manager = User::factory()->create(['role' => UserRole::Manager, 'email' => 'fleet@example.test']);
    config()->set('mail.inspection_reminder_recipients', [$manager->email]);
    $carCategory = EquipmentCategory::factory()->create(['code' => 'car']);
    $car = Equipment::factory()->for($carCategory, 'category')->create([
        'asset_code' => 'A.H-VOI-102',
        'asset_details' => ['inspection_date' => '2026-10-10'],
    ]);

    $sent = app(SendCarInspectionReminder::class)->handle(
        $car,
        CarbonImmutable::parse('2026-09-25'),
    );

    expect($sent)->toBeTrue();
    Mail::assertSent(CarInspectionReminder::class, fn (CarInspectionReminder $mail): bool => $mail->car->is($car) && $mail->hasTo($manager->email));
    $this->assertDatabaseHas('equipment_inspection_reminders', [
        'equipment_id' => $car->id,
        'inspection_date' => '2026-10-10',
        'reminder_type' => 'one_month',
    ]);
});

it('emails equipment managers one month before a car inspection and then weekly', function () {
    Mail::fake();
    $manager = User::factory()->create(['role' => UserRole::Manager, 'email' => 'fleet@example.test']);
    config()->set('mail.inspection_reminder_recipients', [$manager->email]);
    $carCategory = EquipmentCategory::factory()->create(['code' => 'car']);
    $car = Equipment::factory()->for($carCategory, 'category')->create([
        'asset_code' => 'A.H-VOI-101',
        'asset_details' => ['inspection_date' => '2026-10-25'],
    ]);
    Equipment::factory()->for($carCategory, 'category')->create([
        'asset_details' => ['inspection_date' => '2026-11-26'],
    ]);

    $this->artisan(SendCarInspectionReminders::class, ['--date' => '2026-09-25'])
        ->expectsOutput('Sent 1 car inspection reminder(s).')
        ->assertSuccessful();

    Mail::assertSent(CarInspectionReminder::class, function (CarInspectionReminder $mail) use ($car, $manager): bool {
        return $mail->car->is($car) && $mail->hasTo($manager->email);
    });

    $this->artisan(SendCarInspectionReminders::class, ['--date' => '2026-09-25'])
        ->expectsOutput('Sent 0 car inspection reminder(s).')
        ->assertSuccessful();

    expect(EquipmentInspectionReminder::query()->firstOrFail()->reminder_date->toDateString())->toBe('2026-09-25');

    $this->artisan(SendCarInspectionReminders::class, ['--date' => '2026-10-02'])
        ->expectsOutput('Sent 1 car inspection reminder(s).')
        ->assertSuccessful();

    Mail::assertSent(CarInspectionReminder::class, 2);
    $this->assertDatabaseHas('equipment_inspection_reminders', [
        'equipment_id' => $car->id,
        'inspection_date' => '2026-10-25',
        'reminder_type' => 'weekly',
    ]);
    expect(EquipmentInspectionReminder::query()->where('equipment_id', $car->id)->count())->toBe(2);

    $car->update(['asset_details' => ['inspection_date' => '2026-11-25']]);
    $this->artisan(SendCarInspectionReminders::class, ['--date' => '2026-10-25'])
        ->expectsOutput('Sent 1 car inspection reminder(s).')
        ->assertSuccessful();

    $this->assertDatabaseHas('equipment_inspection_reminders', [
        'equipment_id' => $car->id,
        'inspection_date' => '2026-11-25',
        'reminder_type' => 'one_month',
    ]);
});
