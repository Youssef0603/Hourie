<?php

use App\Enums\UserRole;
use App\Models\Project;
use App\Models\PurchaseOrder;
use App\Models\Subcontract;
use App\Models\Subcontractor;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;

uses(LazilyRefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake((string) config('filesystems.equipment_documents_disk'));
    $this->manager = User::factory()->create(['role' => UserRole::Manager]);
    $this->site = Project::factory()->create(['code' => '821', 'name' => 'Villa Marvin']);
    $this->subcontractor = Subcontractor::factory()->create(['name' => 'Ferraillage Abidjan']);
});

/**
 * Steel reinforcement: 450 t at 200 000 = 90 000 000, 10 % retention,
 * 13 500 000 advance recovered at 10 % of each valuation.
 */
function createSteelSubcontract(array $overrides = []): array
{
    return test()->actingAs(test()->manager, 'web')->postJson('/api/v1/subcontracts', array_replace([
        'subcontractor_id' => test()->subcontractor->id,
        'project_id' => test()->site->id,
        'title' => 'Ferraillage des dalles',
        'signed_on' => '2026-09-01',
        'vat_rate' => 0,
        'retention_rate' => 10,
        'advance_amount' => 13500000,
        'advance_recovery_rate' => 10,
        'currency' => 'XOF',
        'items' => [
            ['description' => 'Armatures HA', 'unit' => 't', 'quantity' => 450, 'unit_price' => 200000],
        ],
    ], $overrides))->assertCreated()->json('data');
}

function saveValuation(int $subcontractId, int $itemId, float $cumulative, array $overrides = []): TestResponse
{
    return test()->actingAs(test()->manager, 'web')->postJson("/api/v1/subcontracts/{$subcontractId}/valuations", array_replace([
        'valuation_date' => '2026-10-01',
        'period_end' => '2026-09-30',
        'materials_deduction' => 0,
        'backcharges' => 0,
        'lines' => [['subcontract_item_id' => $itemId, 'cumulative_quantity' => $cumulative]],
    ], $overrides));
}

/** A purchase order buying steel for a subcontract material. */
function steelPurchaseOrder(int $projectId, int $materialId, int $quantity): array
{
    return [
        'supplier_name' => 'Aciérie Abidjan',
        'ordered_on' => '2026-11-20',
        'project_id' => $projectId,
        'vat_rate' => 0,
        'currency' => 'XOF',
        'items' => [['description' => 'Fer HA 12', 'quantity' => $quantity, 'unit_price' => 800, 'subcontract_item_material_id' => $materialId]],
    ];
}

function certify(int $valuationId): void
{
    test()->postJson("/api/v1/subcontract-valuations/{$valuationId}/submit")->assertOk();
    test()->postJson("/api/v1/subcontract-valuations/{$valuationId}/approve")->assertOk();
}

it('creates a subcontract numbered by site with its bill of quantities', function () {
    $subcontract = createSteelSubcontract();

    expect($subcontract['reference'])->toBe('SC-821-26-01')
        ->and($subcontract['summary']['original_amount'])->toBe('90000000.00')
        ->and($subcontract['summary']['revised_amount'])->toBe('90000000.00')
        ->and($subcontract['items'][0]['authorized_quantity'])->toBe('450.000')
        ->and($subcontract['items'][0]['code'])->toBe('821-01');
});

it('numbers work items per site across subcontracts and variations', function () {
    $first = createSteelSubcontract(['items' => [
        ['description' => 'Terrassement', 'unit' => 'm³', 'quantity' => 120, 'unit_price' => 4500],
        ['description' => 'Béton de propreté', 'unit' => 'm³', 'quantity' => 8, 'unit_price' => 45000],
        ['code' => 'IGNORED', 'description' => 'Béton armé', 'unit' => 'm³', 'quantity' => 35, 'unit_price' => 120000],
    ]]);
    $second = createSteelSubcontract(['title' => 'Électricité']);

    expect(collect($first['items'])->pluck('code')->all())->toBe(['821-01', '821-02', '821-03'])
        ->and($second['items'][0]['code'])->toBe('821-04');

    $withVariation = $this->postJson("/api/v1/subcontracts/{$first['id']}/variations", [
        'title' => 'Dallage extérieur',
        'approved_on' => '2026-11-20',
        'new_items' => [['description' => 'Dallage', 'unit' => 'm²', 'quantity' => 60, 'unit_price' => 15000]],
    ])->assertCreated()->json('data');

    expect(collect($withVariation['items'])->pluck('code')->all())->toBe(['821-01', '821-02', '821-03', '821-05']);

    $this->getJson("/api/v1/projects/{$this->site->id}/next-subcontract-item-code")
        ->assertOk()
        ->assertJsonPath('data.site_code', '821')
        ->assertJsonPath('data.next_sequence', 6);

    $renamed = $this->putJson("/api/v1/subcontracts/{$second['id']}", [
        'subcontractor_id' => $this->subcontractor->id,
        'project_id' => $this->site->id,
        'title' => 'Électricité',
        'vat_rate' => 0, 'retention_rate' => 10, 'advance_amount' => 0, 'advance_recovery_rate' => 0, 'currency' => 'XOF',
        'items' => [['id' => $second['items'][0]['id'], 'description' => 'Armatures HA 12', 'unit' => 't', 'quantity' => 450, 'unit_price' => 200000]],
    ])->assertOk()->json('data');

    expect($renamed['items'][0]['code'])->toBe('821-04');
});

it('calculates cumulative valuations with advance recovery and retention', function () {
    $subcontract = createSteelSubcontract();
    $itemId = $subcontract['items'][0]['id'];

    $first = saveValuation($subcontract['id'], $itemId, 200)->assertCreated()->json('data');
    expect($first['reference'])->toBe('SC-821-26-01-SIT-01')
        ->and($first['calculation']['works_cumulative'])->toBe('40000000.00')
        ->and($first['calculation']['advance_recovery_cumulative'])->toBe('4000000.00')
        ->and($first['calculation']['retention_cumulative'])->toBe('4000000.00')
        ->and($first['calculation']['net_due'])->toBe('32000000.00');
    certify($first['id']);

    $second = saveValuation($subcontract['id'], $itemId, 450, ['valuation_date' => '2026-11-01', 'period_end' => '2026-10-31'])
        ->assertCreated()->json('data');

    expect($second['lines'][0]['previous_quantity'])->toBe('200.000')
        ->and($second['lines'][0]['period_quantity'])->toBe('250.000')
        ->and($second['calculation']['works_this_period'])->toBe('50000000.00')
        ->and($second['calculation']['previously_certified'])->toBe('32000000.00')
        ->and($second['calculation']['advance_recovery_this_period'])->toBe('5000000.00')
        ->and($second['calculation']['retention_this_period'])->toBe('5000000.00')
        ->and($second['calculation']['net_due'])->toBe('40000000.00')
        ->and($second['calculation']['advance_remaining'])->toBe('4500000.00');
});

it('blocks quantities above the contract until a variation authorises them', function () {
    $subcontract = createSteelSubcontract(['items' => [
        ['description' => 'Armatures HA', 'unit' => 't', 'quantity' => 1000, 'unit_price' => 200000],
    ]]);
    $itemId = $subcontract['items'][0]['id'];

    saveValuation($subcontract['id'], $itemId, 1044)
        ->assertUnprocessable()
        ->assertJsonValidationErrors('lines.0.cumulative_quantity');

    $withVariation = $this->postJson("/api/v1/subcontracts/{$subcontract['id']}/variations", [
        'title' => 'Dalle supplémentaire niveau 3',
        'approved_on' => '2026-11-12',
        'lines' => [['subcontract_item_id' => $itemId, 'quantity' => 44]],
    ])->assertCreated()->json('data');

    expect($withVariation['items'][0]['authorized_quantity'])->toBe('1044.000')
        ->and($withVariation['summary']['variations_amount'])->toBe('8800000.00')
        ->and($withVariation['variations'][0]['reference'])->toBe('AV-01');
    saveValuation($subcontract['id'], $itemId, 1044)->assertCreated();
});

it('adds new priced items through a variation', function () {
    $subcontract = createSteelSubcontract();

    $updated = $this->postJson("/api/v1/subcontracts/{$subcontract['id']}/variations", [
        'title' => 'Ajout de treillis soudés',
        'approved_on' => '2026-11-12',
        'new_items' => [['description' => 'Treillis soudé', 'unit' => 'm²', 'quantity' => 300, 'unit_price' => 1500]],
    ])->assertCreated()->json('data');

    expect($updated['items'])->toHaveCount(2)
        ->and($updated['items'][1]['quantity'])->toBe('0.000')
        ->and($updated['items'][1]['authorized_quantity'])->toBe('300.000')
        ->and($updated['items'][1]['variation'])->toBe('AV-01')
        ->and($updated['summary']['revised_amount'])->toBe('90450000.00');
});

it('allows only one open valuation at a time', function () {
    $subcontract = createSteelSubcontract();
    $itemId = $subcontract['items'][0]['id'];

    saveValuation($subcontract['id'], $itemId, 100)->assertCreated();
    saveValuation($subcontract['id'], $itemId, 150)->assertUnprocessable()->assertJsonValidationErrors('valuation');
});

it('only marks a valuation paid when the subcontractor invoice equals the net due', function () {
    $subcontract = createSteelSubcontract();
    $valuation = saveValuation($subcontract['id'], $subcontract['items'][0]['id'], 200)->json('data');
    certify($valuation['id']);

    $this->post("/api/v1/subcontract-valuations/{$valuation['id']}/invoice", [
        'invoice_number' => 'FAC-2026-118',
        'invoice_date' => '2026-10-05',
        'invoice_amount' => 33000000,
    ], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('data.invoice.matches', false);
    $this->postJson("/api/v1/subcontract-valuations/{$valuation['id']}/pay")->assertUnprocessable();

    $this->post("/api/v1/subcontract-valuations/{$valuation['id']}/invoice", [
        'invoice_number' => 'FAC-2026-118',
        'invoice_date' => '2026-10-05',
        'invoice_amount' => 32000000,
        'invoice_file' => UploadedFile::fake()->create('facture.pdf', 80, 'application/pdf'),
    ], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('data.invoice.matches', true);
    $this->postJson("/api/v1/subcontract-valuations/{$valuation['id']}/pay")
        ->assertOk()
        ->assertJsonPath('data.status', 'paid');

    $summary = $this->getJson("/api/v1/subcontracts/{$subcontract['id']}")->json('data.summary');
    expect($summary['paid_amount'])->toBe('32000000.00')
        ->and($summary['retention_held'])->toBe('4000000.00');
});

it('locks the bill of quantities once a valuation exists', function () {
    $subcontract = createSteelSubcontract();
    saveValuation($subcontract['id'], $subcontract['items'][0]['id'], 100)->assertCreated();

    $this->putJson("/api/v1/subcontracts/{$subcontract['id']}", [
        'subcontractor_id' => $this->subcontractor->id,
        'project_id' => $this->site->id,
        'title' => 'Ferraillage — titre corrigé',
        'vat_rate' => 0,
        'retention_rate' => 10,
        'advance_amount' => 13500000,
        'advance_recovery_rate' => 10,
        'currency' => 'XOF',
        'items' => [['description' => 'Autre', 'unit' => 't', 'quantity' => 9999, 'unit_price' => 1]],
    ])->assertOk()
        ->assertJsonPath('data.title', 'Ferraillage — titre corrigé')
        ->assertJsonPath('data.items.0.quantity', '450.000');
});

it('does not let viewers create subcontracts or valuations', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $subcontract = Subcontract::factory()->create();

    $this->actingAs($viewer, 'web')->getJson('/api/v1/subcontracts')->assertOk();
    $this->actingAs($viewer, 'web')->postJson('/api/v1/subcontracts', [])->assertForbidden();
    $this->actingAs($viewer, 'web')->postJson("/api/v1/subcontracts/{$subcontract->id}/valuations", [])->assertForbidden();
});

it('checks supplier invoices against the purchase order and its delivery note', function () {
    $purchaseOrder = PurchaseOrder::factory()->create(['vat_rate' => 0, 'created_by_user_id' => $this->manager->id]);
    $purchaseOrder->items()->create(['position' => 1, 'description' => 'Demi barbotin', 'quantity' => 1, 'unit_price' => 500000]);
    $invoice = fn (int $amount) => $this->actingAs($this->manager, 'web')->post("/api/v1/purchase-orders/{$purchaseOrder->id}/invoices", [
        'invoice_number' => 'BMS-261119',
        'invoiced_on' => '2026-11-21',
        'amount' => $amount,
        'invoice_file' => UploadedFile::fake()->create('facture.pdf', 50, 'application/pdf'),
    ], ['Accept' => 'application/json']);

    $invoice(700000)->assertCreated()
        ->assertJsonPath('data.invoice_check.status', 'amount_mismatch')
        ->assertJsonPath('data.invoice_check.difference', '200000.00');

    $purchaseOrder->invoices()->delete();
    $invoice(500000)->assertCreated()->assertJsonPath('data.invoice_check.status', 'missing_delivery_note');
});

it('deletes a contract with draft valuations only, and keeps contracts with certified ones', function () {
    $draftOnly = createSteelSubcontract();
    saveValuation($draftOnly['id'], $draftOnly['items'][0]['id'], 100)->assertCreated();

    $this->deleteJson("/api/v1/subcontracts/{$draftOnly['id']}")->assertNoContent();
    expect(Subcontract::query()->find($draftOnly['id']))->toBeNull();

    $certified = createSteelSubcontract(['title' => 'Avec situation approuvée']);
    certify(saveValuation($certified['id'], $certified['items'][0]['id'], 100)->json('data.id'));

    $this->deleteJson("/api/v1/subcontracts/{$certified['id']}")
        ->assertUnprocessable()
        ->assertJsonValidationErrors('subcontract');
    expect(Subcontract::query()->find($certified['id']))->not->toBeNull();
});

it('compares the materials ARH bought with what the executed work needed', function () {
    $subcontract = createSteelSubcontract(['advance_amount' => 0, 'advance_recovery_rate' => 0, 'items' => [[
        'description' => 'Pose des armatures HA', 'unit' => 'kg', 'quantity' => 4500, 'unit_price' => 250,
        'materials_supplied_by' => 'arh',
        'materials' => [['name' => 'Fer HA', 'unit' => 'kg', 'quantity_per_unit' => 1, 'waste_percent' => 5]],
    ]]]);
    $item = $subcontract['items'][0];
    expect($item['materials_supplied_by'])->toBe('arh')
        ->and($item['materials'][0]['name'])->toBe('Fer HA');

    $materialId = $this->getJson("/api/v1/projects/{$this->site->id}/subcontract-materials")
        ->assertOk()
        ->assertJsonPath('data.0.item_code', '821-01')
        ->json('data.0.id');

    foreach ([2000, 1200] as $quantity) {
        $this->postJson('/api/v1/purchase-orders', steelPurchaseOrder($this->site->id, $materialId, $quantity))->assertCreated()
            ->assertJsonPath('data.items.0.budget_code', '821-01')
            ->assertJsonPath('data.items.0.unit', 'kg');
    }

    certify(saveValuation($subcontract['id'], $item['id'], 2500)->json('data.id'));

    $check = $this->getJson("/api/v1/subcontracts/{$subcontract['id']}")->json('data.material_check.0');
    expect($check['executed_quantity'])->toBe('2500.000')
        ->and($check['materials'][0]['needed_quantity'])->toBe('2625.000')
        ->and($check['materials'][0]['bought_quantity'])->toBe('3200.000')
        ->and($check['materials'][0]['gap_quantity'])->toBe('575.000')
        ->and($check['materials'][0]['gap_amount'])->toBe('460000.00')
        ->and($check['materials'][0]['status'])->toBe('surplus')
        ->and($check['materials'][0]['purchase_orders'])->toHaveCount(2)
        ->and($check['materials'][0]['purchase_orders'][0]['pdf_url'])->toStartWith('/api/v1/purchase-orders/');

    $linkedOrders = $this->getJson("/api/v1/subcontracts/{$subcontract['id']}")->json('data.purchase_orders');
    expect($linkedOrders)->toHaveCount(2)
        ->and($linkedOrders[0])->toHaveKeys(['number', 'supplier_name', 'ordered_on', 'pdf_url']);

    $otherSite = Project::factory()->create(['code' => '815', 'name' => 'Bassam']);
    $this->postJson('/api/v1/purchase-orders', steelPurchaseOrder($otherSite->id, $materialId, 10))->assertUnprocessable()->assertJsonValidationErrors('items.0.subcontract_item_material_id');
});
