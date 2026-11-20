<?php

use App\Models\Project;
use App\Models\PurchaseOrder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake((string) config('filesystems.equipment_documents_disk'));
});

it('renumbers legacy purchase orders per site and year in date order', function () {
    $gesco = Project::factory()->create(['code' => '816', 'name' => 'Gesco']);
    $bassam = Project::factory()->create(['code' => '815', 'name' => 'Bassam']);
    $unlinked = PurchaseOrder::factory()->create(['number' => '0000819', 'project_id' => null, 'ordered_on' => '2026-11-17']);
    $gescoLater = PurchaseOrder::factory()->create(['number' => '0000820', 'project_id' => $gesco->id, 'ordered_on' => '2026-11-19']);
    $gescoEarlier = PurchaseOrder::factory()->create(['number' => '0000818', 'project_id' => $gesco->id, 'ordered_on' => '2026-07-17']);
    $bassamOrder = PurchaseOrder::factory()->create(['number' => '0000815', 'project_id' => $bassam->id, 'ordered_on' => '2026-08-05']);
    $alreadyNumbered = PurchaseOrder::factory()->create(['number' => 'BC-816-27-0001', 'project_id' => $gesco->id, 'ordered_on' => '2027-01-03']);

    $this->artisan('purchase-orders:renumber')
        ->expectsOutput('0000818 → BC-816-26-0001')
        ->expectsOutput('0000820 → BC-816-26-0002')
        ->expectsOutputToContain('0000819 skipped')
        ->assertSuccessful();

    expect($gescoEarlier->fresh()->number)->toBe('BC-816-26-0001')
        ->and($gescoLater->fresh()->number)->toBe('BC-816-26-0002')
        ->and($bassamOrder->fresh()->number)->toBe('BC-815-26-0001')
        ->and($unlinked->fresh()->number)->toBe('0000819')
        ->and($alreadyNumbered->fresh()->number)->toBe('BC-816-27-0001');

    $renumbered = $gescoEarlier->fresh();
    expect($renumbered->pdf_path)->toContain('BC-816-26-0001');
    Storage::disk($renumbered->pdf_disk)->assertExists($renumbered->pdf_path);
});

it('only previews the new numbers on a dry run', function () {
    $gesco = Project::factory()->create(['code' => '816', 'name' => 'Gesco']);
    $first = PurchaseOrder::factory()->create(['number' => '0000818', 'project_id' => $gesco->id, 'ordered_on' => '2026-07-17']);
    $second = PurchaseOrder::factory()->create(['number' => '0000820', 'project_id' => $gesco->id, 'ordered_on' => '2026-11-19']);

    $this->artisan('purchase-orders:renumber', ['--dry-run' => true])
        ->expectsOutput('0000818 → BC-816-26-0001')
        ->expectsOutput('0000820 → BC-816-26-0002')
        ->assertSuccessful();

    expect($first->fresh()->number)->toBe('0000818')
        ->and($second->fresh()->number)->toBe('0000820');
});
