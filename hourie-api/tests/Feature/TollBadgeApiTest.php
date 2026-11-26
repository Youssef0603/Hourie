<?php

use App\Enums\UserRole;
use App\Models\Equipment;
use App\Models\TollBadge;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;

uses(LazilyRefreshDatabase::class);

function tollBadgePayload(array $overrides = []): array
{
    return array_replace([
        'operator' => 'hkb',
        'badge_number' => '9384010209304000015',
        'serial_number' => '50 - 0003154676',
        'subscription_number' => '110400355654',
        'registered_phone' => '0700000000',
        'status' => 'active',
        'balance' => 4000,
        'balance_checked_on' => '2026-11-20',
        'notes' => null,
    ], $overrides);
}

it('records badges on a vehicle and lists only that vehicle’s badges', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::Manager]), 'web');
    $car = Equipment::factory()->create();
    $truck = Equipment::factory()->create();

    $this->postJson("/api/v1/equipment/{$car->id}/toll-badges", tollBadgePayload())
        ->assertCreated()
        ->assertJsonPath('data.balance', '4000.00')
        ->assertJsonPath('data.equipment_id', $car->id);
    TollBadge::factory()->create(['equipment_id' => $truck->id]);

    $this->getJson("/api/v1/equipment/{$car->id}/toll-badges")
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.badge_number', '9384010209304000015');
});

it('refuses the same badge twice for one operator, even on another vehicle', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::Manager]), 'web');
    $car = Equipment::factory()->create();
    $truck = Equipment::factory()->create();
    $this->postJson("/api/v1/equipment/{$car->id}/toll-badges", tollBadgePayload())->assertCreated();

    $this->postJson("/api/v1/equipment/{$truck->id}/toll-badges", tollBadgePayload())
        ->assertUnprocessable()
        ->assertJsonValidationErrors('badge_number');
    $this->postJson("/api/v1/equipment/{$truck->id}/toll-badges", tollBadgePayload(['operator' => 'fer']))->assertCreated();
});

it('updates the balance and removes the badges with their vehicle', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::Manager]), 'web');
    $car = Equipment::factory()->create();
    $badge = TollBadge::factory()->create(['equipment_id' => $car->id]);

    $this->putJson("/api/v1/equipment/{$car->id}/toll-badges/{$badge->id}", tollBadgePayload(['badge_number' => $badge->badge_number, 'balance' => 8000, 'status' => 'lost']))
        ->assertOk()
        ->assertJsonPath('data.balance', '8000.00')
        ->assertJsonPath('data.status', 'lost');

    $other = Equipment::factory()->create();
    $this->deleteJson("/api/v1/equipment/{$other->id}/toll-badges/{$badge->id}")->assertNotFound();

    $car->forceDelete();
    expect(TollBadge::query()->count())->toBe(0);
});

it('lets viewers read badges but not change them', function () {
    $this->actingAs(User::factory()->create(['role' => UserRole::Viewer]), 'web');
    $car = Equipment::factory()->create();
    $badge = TollBadge::factory()->create(['equipment_id' => $car->id]);

    $this->getJson("/api/v1/equipment/{$car->id}/toll-badges")->assertOk()->assertJsonCount(1, 'data');
    $this->postJson("/api/v1/equipment/{$car->id}/toll-badges", tollBadgePayload())->assertForbidden();
    $this->putJson("/api/v1/equipment/{$car->id}/toll-badges/{$badge->id}", tollBadgePayload())->assertForbidden();
    $this->deleteJson("/api/v1/equipment/{$car->id}/toll-badges/{$badge->id}")->assertForbidden();
});
