<?php

use App\Enums\UserRole;
use App\Models\Project;
use App\Models\Subcontractor;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;

uses(LazilyRefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake((string) config('filesystems.equipment_documents_disk'));
    $this->actingAs(User::factory()->create(['role' => UserRole::Manager]), 'web');
    $this->site = Project::factory()->create(['code' => '117', 'name' => 'Abidjan Tower']);
    $this->subcontractor = Subcontractor::factory()->create(['name' => 'SOLID']);
});

/**
 * The SOLID geotechnical works of Abidjan Tower, as the PM follows them on
 * paper: 1 200 000 000 contract, 240 000 000 advance recovered at 20 %, 5 %
 * retention, 18 % VAT, half of every amount paid in cash.
 */
function solidContract(): array
{
    return test()->postJson('/api/v1/subcontracts', [
        'subcontractor_id' => test()->subcontractor->id,
        'project_id' => test()->site->id,
        'title' => 'Geotechnical works',
        'signed_on' => '2025-06-01',
        'vat_rate' => 18,
        'retention_rate' => 5,
        'advance_amount' => 240000000,
        'advance_recovery_rate' => 20,
        'cash_percent' => 50,
        'currency' => 'XOF',
        'items' => [['description' => 'Pieux forés', 'unit' => 'ml', 'quantity' => 1200000, 'unit_price' => 1000]],
    ])->assertCreated()->json('data');
}

function pay(int $valuationId, int $amount, string $method, int $vat = 0): TestResponse
{
    return test()->postJson("/api/v1/subcontract-valuations/{$valuationId}/payments", [
        'amount' => $amount,
        'vat_amount' => $vat,
        'paid_on' => '2026-09-15',
        'method' => $method,
    ]);
}

/** Opening balance after the four paper valuations: 306 000 000 by work item, 661 008 000 without breakdown. */
function solidOpening(array $contract): TestResponse
{
    return test()->postJson("/api/v1/subcontracts/{$contract['id']}/opening", [
        'last_sequence' => 4,
        'valuation_date' => '2026-08-31',
        'period_end' => '2026-08-31',
        'historical_works_amount' => 661008000,
        'lines' => [['subcontract_item_id' => $contract['items'][0]['id'], 'cumulative_quantity' => 306000]],
    ]);
}

it('reproduces the PM valuation of SOLID n°5 with its cash and cheque split', function () {
    $contract = solidContract();

    $advance = $contract['valuations'][0];
    expect($advance['kind'])->toBe('advance')
        ->and($advance['net_due'])->toBe('261600000.00');

    $opening = solidOpening($contract)->assertCreated()->json('data');
    expect($opening['kind'])->toBe('opening')
        ->and($opening['status'])->toBe('approved')
        ->and($opening['calculation']['works_cumulative'])->toBe('967008000.00')
        ->and($opening['calculation']['advance_recovery_cumulative'])->toBe('193401600.00')
        ->and($opening['calculation']['retention_cumulative'])->toBe('48350400.00')
        ->and($opening['calculation']['net_before_vat'])->toBe('725256000.00')
        ->and($opening['calculation']['vat_amount'])->toBe('65273040.00');

    // What was paid before Hourie: 394 050 000 cash, 394 050 000 by cheque and 70 929 000 of VAT.
    pay($advance['id'], 120000000, 'cash')->assertOk();
    pay($advance['id'], 141600000, 'cheque', 21600000)->assertOk()->assertJsonPath('data.status', 'paid');
    pay($opening['id'], 274050000, 'cash')->assertOk();
    pay($opening['id'], 323379000, 'cheque', 49329000)->assertOk()->assertJsonPath('data.status', 'partially_paid');

    $valuation = test()->postJson("/api/v1/subcontracts/{$contract['id']}/valuations", [
        'valuation_date' => '2026-09-29',
        'period_end' => '2026-09-29',
        'materials_deduction' => 0,
        'backcharges' => 0,
        'lines' => [['subcontract_item_id' => $contract['items'][0]['id'], 'cumulative_quantity' => 326304]],
    ])->assertCreated()->json('data');

    expect($valuation['reference'])->toBe('SC-117-25-01-SIT-05')
        ->and($valuation['calculation']['works_cumulative'])->toBe('987312000.00')
        ->and($valuation['calculation']['works_this_period'])->toBe('20304000.00')
        ->and($valuation['calculation']['advance_recovery_this_period'])->toBe('4060800.00')
        ->and($valuation['calculation']['retention_this_period'])->toBe('1015200.00')
        ->and($valuation['calculation']['net_before_vat'])->toBe('15228000.00')
        ->and($valuation['calculation']['cash_amount'])->toBe('7614000.00')
        ->and($valuation['calculation']['cheque_amount'])->toBe('7614000.00')
        ->and($valuation['calculation']['vat_amount'])->toBe('1370520.00')
        ->and($valuation['calculation']['net_due'])->toBe('16598520.00')
        ->and($valuation['calculation']['advance_remaining'])->toBe('42537600.00')
        ->and($valuation['invoice_expected'])->toBe('8984520.00');

    test()->postJson("/api/v1/subcontract-valuations/{$valuation['id']}/submit")->assertOk();
    test()->postJson("/api/v1/subcontract-valuations/{$valuation['id']}/approve")->assertOk();

    $summary = test()->getJson("/api/v1/subcontracts/{$contract['id']}")->json('data.summary');
    expect($summary['retention_held'])->toBe('49365600.00')
        ->and($summary['channels']['cash'])->toBe(['due' => '490242000.00', 'paid' => '394050000.00', 'balance' => '96192000.00'])
        ->and($summary['channels']['cheque'])->toBe(['due' => '490242000.00', 'paid' => '394050000.00', 'balance' => '96192000.00'])
        ->and($summary['channels']['vat'])->toBe(['due' => '88243560.00', 'paid' => '70929000.00', 'balance' => '17314560.00'])
        ->and($summary['to_pay_amount'])->toBe('209698560.00');
});

it('checks each payment against its own channel', function () {
    $contract = solidContract();
    $valuation = test()->postJson("/api/v1/subcontracts/{$contract['id']}/valuations", [
        'valuation_date' => '2026-09-29',
        'period_end' => '2026-09-29',
        'materials_deduction' => 0,
        'backcharges' => 0,
        'lines' => [['subcontract_item_id' => $contract['items'][0]['id'], 'cumulative_quantity' => 10000]],
    ])->json('data');
    test()->postJson("/api/v1/subcontract-valuations/{$valuation['id']}/submit")->assertOk();
    test()->postJson("/api/v1/subcontract-valuations/{$valuation['id']}/approve")->assertOk();

    // 10 000 000 of works: 7 500 000 before VAT, 3 750 000 cash, 3 750 000 cheque + 675 000 VAT.
    pay($valuation['id'], 1000, 'cash')->assertUnprocessable()->assertJsonValidationErrors('invoice_amount');
    test()->post("/api/v1/subcontract-valuations/{$valuation['id']}/invoice", [
        'invoice_number' => 'F-118',
        'invoice_date' => '2026-09-30',
        'invoice_amount' => 4425000,
        'invoice_file' => UploadedFile::fake()->create('facture.pdf', 80, 'application/pdf'),
    ], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('data.invoice.matches', true);

    pay($valuation['id'], 1000, 'cash', 100)->assertUnprocessable()->assertJsonValidationErrors('vat_amount');
    pay($valuation['id'], 3750001, 'cash')->assertUnprocessable()->assertJsonValidationErrors('amount');
    pay($valuation['id'], 3750001, 'transfer')->assertUnprocessable()->assertJsonValidationErrors('amount');
    pay($valuation['id'], 700000, 'cheque', 675001)->assertUnprocessable()->assertJsonValidationErrors('vat_amount');

    pay($valuation['id'], 3750000, 'cash')->assertOk()
        ->assertJsonPath('data.channels.cash.balance', '0.00')
        ->assertJsonPath('data.status', 'partially_paid');
    pay($valuation['id'], 4425000, 'transfer', 675000)->assertOk()
        ->assertJsonPath('data.channels.cheque.balance', '0.00')
        ->assertJsonPath('data.channels.vat.balance', '0.00')
        ->assertJsonPath('data.status', 'paid');
});

it('accepts an opening balance only before the first situation, and removes it while unpaid', function () {
    $contract = solidContract();
    $opening = solidOpening($contract)->assertCreated()->json('data');
    solidOpening($contract)->assertUnprocessable()->assertJsonValidationErrors('valuation');

    test()->deleteJson("/api/v1/subcontract-valuations/{$opening['id']}")->assertNoContent();
    expect(test()->getJson("/api/v1/subcontracts/{$contract['id']}")->json('data.historical_works_amount'))->toBe('0.00');

    $opening = solidOpening($contract)->assertCreated()->json('data');
    pay($opening['id'], 1000, 'cash')->assertOk();
    test()->deleteJson("/api/v1/subcontract-valuations/{$opening['id']}")->assertUnprocessable();
});

it('keeps the advance entry in line with the contract until it is paid', function () {
    $contract = solidContract();
    $payload = [
        ...collect($contract)->only(['title', 'signed_on', 'vat_rate', 'retention_rate', 'advance_recovery_rate', 'currency'])->all(),
        'subcontractor_id' => $contract['subcontractor']['id'],
        'project_id' => $contract['project']['id'],
        'cash_percent' => 0,
        'items' => [['id' => $contract['items'][0]['id'], 'description' => 'Pieux forés', 'unit' => 'ml', 'quantity' => 1200000, 'unit_price' => 1000]],
    ];

    $updated = test()->putJson("/api/v1/subcontracts/{$contract['id']}", [...$payload, 'advance_amount' => 100000000])->assertOk()->json('data');
    expect($updated['valuations'][0]['net_due'])->toBe('118000000.00');

    $removed = test()->putJson("/api/v1/subcontracts/{$contract['id']}", [...$payload, 'advance_amount' => 0])->assertOk()->json('data');
    expect($removed['valuations'])->toBe([]);
});

it('prints the sheet of the next situation with the contract history', function () {
    $contract = solidContract();
    solidOpening($contract)->assertCreated();

    $response = test()->get("/api/v1/subcontracts/{$contract['id']}/valuation-sheet?preview=1")->assertOk();

    expect($response->headers->get('Content-Type'))->toBe('application/pdf')
        ->and($response->headers->get('Content-Disposition'))->toContain('inline; filename="Fiche_situation_SC-117-25-01.pdf"')
        ->and(substr((string) $response->getContent(), 0, 4))->toBe('%PDF');
});
