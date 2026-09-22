<?php

use App\Enums\EquipmentChangeType;
use App\Enums\UserRole;
use App\Models\Equipment;
use App\Models\EquipmentInvoice;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class);

function fakeInvoicePdf(string $name = 'facture-generator.pdf'): UploadedFile
{
    return UploadedFile::fake()->createWithContent($name, "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
}

it('allows equipment managers to upload private PDF invoices and audits the upload', function () {
    Storage::fake('equipment-documents');
    $manager = User::factory()->create(['role' => UserRole::CmsManager]);
    $equipment = Equipment::factory()->create();

    $response = $this->actingAs($manager, 'web')
        ->postJson("/api/v1/equipment/{$equipment->id}/invoices", [
            'invoices' => [fakeInvoicePdf()],
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.0.original_name', 'facture-generator.pdf')
        ->assertJsonPath('data.0.uploaded_by.id', $manager->id);

    $invoice = EquipmentInvoice::query()->firstOrFail();
    expect($invoice->disk)->toBe('equipment-documents');
    Storage::disk('equipment-documents')->assertExists($invoice->path);
    $this->assertDatabaseHas('equipment_changes', [
        'equipment_id' => $equipment->id,
        'change_type' => EquipmentChangeType::InvoiceAdded->value,
    ]);
});

it('shows invoices in generator details and lets authenticated users download them', function () {
    Storage::fake('equipment-documents');
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $equipment = Equipment::factory()->create();
    $path = "equipment/{$equipment->id}/invoices/invoice.pdf";
    Storage::disk('equipment-documents')->put($path, "%PDF-1.4\n%%EOF");
    $invoice = EquipmentInvoice::factory()->for($equipment)->create([
        'disk' => 'equipment-documents',
        'path' => $path,
    ]);

    $this->actingAs($viewer, 'web')
        ->getJson("/api/v1/equipment/{$equipment->id}")
        ->assertOk()
        ->assertJsonPath('data.invoices.0.id', $invoice->id)
        ->assertJsonPath('data.invoices.0.original_name', 'facture-generator.pdf');

    $this->actingAs($viewer, 'web')
        ->get("/api/v1/equipment/{$equipment->id}/invoices/{$invoice->id}/file")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf')
        ->assertHeader('x-content-type-options', 'nosniff');
});

it('returns a clean unauthorized response for a direct unauthenticated invoice request', function () {
    $equipment = Equipment::factory()->create();
    $invoice = EquipmentInvoice::factory()->for($equipment)->create();

    $this->get("/api/v1/equipment/{$equipment->id}/invoices/{$invoice->id}/file")
        ->assertUnauthorized()
        ->assertJsonPath('message', 'Unauthenticated.');
});

it('rejects non PDF invoice uploads', function () {
    Storage::fake('equipment-documents');
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $equipment = Equipment::factory()->create();

    $this->actingAs($manager, 'web')
        ->postJson("/api/v1/equipment/{$equipment->id}/invoices", [
            'invoices' => [UploadedFile::fake()->image('not-an-invoice.jpg')],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('invoices.0');
});

it('prevents viewers from uploading or deleting invoices', function () {
    Storage::fake('equipment-documents');
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $equipment = Equipment::factory()->create();
    $invoice = EquipmentInvoice::factory()->for($equipment)->create();

    $this->actingAs($viewer, 'web')
        ->postJson("/api/v1/equipment/{$equipment->id}/invoices", [
            'invoices' => [fakeInvoicePdf()],
        ])
        ->assertForbidden();

    $this->actingAs($viewer, 'web')
        ->deleteJson("/api/v1/equipment/{$equipment->id}/invoices/{$invoice->id}")
        ->assertForbidden();
});

it('deletes invoice files and records the audit event', function () {
    Storage::fake('equipment-documents');
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $equipment = Equipment::factory()->create();
    $path = "equipment/{$equipment->id}/invoices/invoice.pdf";
    Storage::disk('equipment-documents')->put($path, "%PDF-1.4\n%%EOF");
    $invoice = EquipmentInvoice::factory()->for($equipment)->create([
        'disk' => 'equipment-documents',
        'path' => $path,
    ]);

    $this->actingAs($manager, 'web')
        ->deleteJson("/api/v1/equipment/{$equipment->id}/invoices/{$invoice->id}")
        ->assertNoContent();

    Storage::disk('equipment-documents')->assertMissing($path);
    $this->assertDatabaseMissing('equipment_invoices', ['id' => $invoice->id]);
    $this->assertDatabaseHas('equipment_changes', [
        'equipment_id' => $equipment->id,
        'change_type' => EquipmentChangeType::InvoiceDeleted->value,
    ]);
});

it('does not expose an invoice through a different generator', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $equipment = Equipment::factory()->create();
    $otherEquipment = Equipment::factory()->create();
    $invoice = EquipmentInvoice::factory()->for($equipment)->create();

    $this->actingAs($viewer, 'web')
        ->get("/api/v1/equipment/{$otherEquipment->id}/invoices/{$invoice->id}/file")
        ->assertNotFound();
});
