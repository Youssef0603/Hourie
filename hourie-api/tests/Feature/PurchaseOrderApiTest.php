<?php

use App\Enums\UserRole;
use App\Models\PurchaseOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class);

beforeEach(function (): void {
    Storage::fake((string) config('filesystems.equipment_documents_disk'));
});

function purchaseOrderPayload(array $overrides = []): array
{
    return array_replace([
        'supplier_name' => 'Fournitures Abidjan',
        'supplier_phone' => '+225 01 02 03 04 05',
        'supplier_fax' => null,
        'ordered_on' => '2026-11-17',
        'follow_up_agent' => 'Awa Koné',
        'contact_name' => 'M. Diallo',
        'project_name' => 'Chantier Bassam',
        'reason' => 'Matériel de chantier',
        'prepared_by' => 'Youssef Yassine',
        'ordered_by' => 'Responsable achats',
        'approved_by' => null,
        'vat_rate' => 18,
        'currency' => 'XOF',
        'notes' => null,
        'items' => [
            ['budget_code' => 'BUD-101', 'description' => 'Ciment', 'quantity' => 2, 'unit_price' => 1000.50],
            ['budget_code' => 'BUD-102', 'description' => 'Sable', 'quantity' => 3, 'unit_price' => 200],
        ],
    ], $overrides);
}

it('creates a numbered purchase order and calculates exact totals', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);

    $response = $this->actingAs($manager, 'web')
        ->postJson('/api/v1/purchase-orders', purchaseOrderPayload());

    $response->assertCreated()
        ->assertJsonPath('data.number', '0000813')
        ->assertJsonPath('data.subtotal', '2601.00')
        ->assertJsonPath('data.vat_amount', '468.18')
        ->assertJsonPath('data.total', '3069.18')
        ->assertJsonPath('data.pdf_url', '/api/v1/purchase-orders/1/pdf')
        ->assertJsonCount(0, 'data.delivery_notes')
        ->assertJsonCount(2, 'data.items');
    $this->assertDatabaseHas('purchase_orders', [
        'number' => 813,
        'supplier_name' => 'Fournitures Abidjan',
        'created_by_user_id' => $manager->id,
    ]);
    $this->assertDatabaseHas('purchase_order_items', [
        'position' => 2,
        'description' => 'Sable',
    ]);
    $purchaseOrder = PurchaseOrder::query()->firstOrFail();
    expect($purchaseOrder->pdf_generated_at)->not->toBeNull();
    Storage::disk($purchaseOrder->pdf_disk)->assertExists($purchaseOrder->pdf_path);
});

it('stores previews and deletes delivery notes attached to a purchase order', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $purchaseOrder = PurchaseOrder::factory()->create(['created_by_user_id' => $manager->id]);

    $upload = $this->actingAs($manager, 'web')->post(
        "/api/v1/purchase-orders/{$purchaseOrder->id}/delivery-notes",
        ['delivery_notes' => [UploadedFile::fake()->create('Bon de livraison BL18413.pdf', 120, 'application/pdf')]],
        ['Accept' => 'application/json'],
    );

    $upload->assertCreated()
        ->assertJsonPath('data.0.original_name', 'Bon de livraison BL18413.pdf');
    $document = $purchaseOrder->deliveryNotes()->firstOrFail();
    Storage::disk($document->disk)->assertExists($document->path);

    $this->actingAs($manager, 'web')
        ->get("/api/v1/purchase-orders/{$purchaseOrder->id}/delivery-notes/{$document->id}/file?preview=1")
        ->assertOk()
        ->assertHeader('content-disposition', 'inline; filename="Bon de livraison BL18413.pdf"');

    $this->actingAs($manager, 'web')
        ->deleteJson("/api/v1/purchase-orders/{$purchaseOrder->id}/delivery-notes/{$document->id}")
        ->assertNoContent();
    Storage::disk($document->disk)->assertMissing($document->path);
    $this->assertDatabaseMissing('purchase_order_delivery_notes', ['id' => $document->id]);
});

it('downloads the stored purchase order pdf', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $purchaseOrder = PurchaseOrder::factory()->create(['number' => 901, 'created_by_user_id' => $manager->id]);
    $purchaseOrder->items()->create([
        'position' => 1,
        'description' => 'Générateur',
        'quantity' => 1,
        'unit_price' => 39812.50,
    ]);

    $response = $this->actingAs($manager, 'web')->get("/api/v1/purchase-orders/{$purchaseOrder->id}/pdf");

    $response->assertOk()->assertHeader('content-type', 'application/pdf');
    $purchaseOrder->refresh();
    Storage::disk($purchaseOrder->pdf_disk)->assertExists($purchaseOrder->pdf_path);
    expect(Storage::disk($purchaseOrder->pdf_disk)->size($purchaseOrder->pdf_path))->toBeGreaterThan(1000);
});

it('updates an existing purchase order while preserving its number', function () {
    $manager = User::factory()->create(['role' => UserRole::CmsManager]);
    $purchaseOrder = PurchaseOrder::factory()->create(['number' => 900]);
    $purchaseOrder->items()->create([
        'position' => 1,
        'description' => 'Ancienne ligne',
        'quantity' => 1,
        'unit_price' => 50,
    ]);

    $response = $this->actingAs($manager, 'web')->putJson(
        "/api/v1/purchase-orders/{$purchaseOrder->id}",
        purchaseOrderPayload(['supplier_name' => 'Nouveau fournisseur']),
    );

    $response->assertOk()
        ->assertJsonPath('data.number', '0000900')
        ->assertJsonPath('data.supplier_name', 'Nouveau fournisseur')
        ->assertJsonCount(2, 'data.items');
    expect($purchaseOrder->items()->where('description', 'Ancienne ligne')->exists())->toBeFalse();
});

it('allows viewers to read but not create purchase orders', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);

    $this->actingAs($viewer, 'web')->getJson('/api/v1/purchase-orders')->assertOk();
    $this->actingAs($viewer, 'web')
        ->postJson('/api/v1/purchase-orders', purchaseOrderPayload())
        ->assertForbidden();
});

it('rejects a purchase order without any line items', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);

    $this->actingAs($manager, 'web')
        ->postJson('/api/v1/purchase-orders', purchaseOrderPayload(['items' => []]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('items');
});

it('rejects decimal purchase order quantities', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $items = purchaseOrderPayload()['items'];
    $items[0]['quantity'] = 1.5;

    $this->actingAs($manager, 'web')
        ->postJson('/api/v1/purchase-orders', purchaseOrderPayload(['items' => $items]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors('items.0.quantity');
});
