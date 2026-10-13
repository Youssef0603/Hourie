<?php

use App\Enums\EquipmentChangeType;
use App\Enums\UserRole;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\EquipmentVehicleDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class);

function fakeVehicleDocumentPdf(string $name = 'carte-grise.pdf'): UploadedFile
{
    return UploadedFile::fake()->createWithContent($name, "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
}

function carEquipment(): Equipment
{
    $category = EquipmentCategory::factory()->create(['code' => 'car', 'name' => 'Voitures']);

    return Equipment::factory()->for($category, 'category')->create();
}

it('allows equipment managers to upload car documents and audits the upload', function () {
    Storage::fake('equipment-documents');
    $manager = User::factory()->create(['role' => UserRole::CmsManager]);
    $car = carEquipment();

    $response = $this->actingAs($manager, 'web')
        ->postJson("/api/v1/equipment/{$car->id}/vehicle-documents", [
            'document' => fakeVehicleDocumentPdf('controle-technique.pdf'),
        ]);

    $response
        ->assertCreated()
        ->assertJsonPath('data.original_name', 'controle-technique.pdf')
        ->assertJsonPath('data.uploaded_by.id', $manager->id);

    $document = EquipmentVehicleDocument::query()->firstOrFail();
    Storage::disk('equipment-documents')->assertExists($document->path);
    $this->assertDatabaseHas('equipment_changes', [
        'equipment_id' => $car->id,
        'change_type' => EquipmentChangeType::VehicleDocumentAdded->value,
    ]);
});

it('shows vehicle documents in car details and lets authenticated users download them', function () {
    Storage::fake('equipment-documents');
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $car = carEquipment();
    $path = "equipment/{$car->id}/vehicle-documents/carte-grise.pdf";
    Storage::disk('equipment-documents')->put($path, "%PDF-1.4\n%%EOF");
    $document = EquipmentVehicleDocument::factory()->for($car)->create([
        'disk' => 'equipment-documents',
        'path' => $path,
    ]);

    $this->actingAs($viewer, 'web')
        ->getJson("/api/v1/equipment/{$car->id}")
        ->assertOk()
        ->assertJsonPath('data.vehicle_documents.0.id', $document->id)
        ->assertJsonPath('data.vehicle_documents.0.original_name', 'carte-grise.pdf');

    $this->actingAs($viewer, 'web')
        ->get("/api/v1/equipment/{$car->id}/vehicle-documents/{$document->id}/file")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf')
        ->assertHeader('x-content-type-options', 'nosniff');
});

it('rejects invalid files and documents attached to non-car equipment', function () {
    Storage::fake('equipment-documents');
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $car = carEquipment();

    $this->actingAs($manager, 'web')
        ->postJson("/api/v1/equipment/{$car->id}/vehicle-documents", [
            'document' => UploadedFile::fake()->image('document.jpg'),
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('document');

    $equipment = Equipment::factory()->create();

    $this->actingAs($manager, 'web')
        ->postJson("/api/v1/equipment/{$equipment->id}/vehicle-documents", [
            'document' => fakeVehicleDocumentPdf(),
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('document');
});

it('prevents viewers from uploading or deleting vehicle documents', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $car = carEquipment();
    $document = EquipmentVehicleDocument::factory()->for($car)->create();

    $this->actingAs($viewer, 'web')
        ->postJson("/api/v1/equipment/{$car->id}/vehicle-documents", [
            'document' => fakeVehicleDocumentPdf(),
        ])
        ->assertForbidden();

    $this->actingAs($viewer, 'web')
        ->deleteJson("/api/v1/equipment/{$car->id}/vehicle-documents/{$document->id}")
        ->assertForbidden();
});

it('deletes car document files and records the audit event', function () {
    Storage::fake('equipment-documents');
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $car = carEquipment();
    $path = "equipment/{$car->id}/vehicle-documents/carte-grise.pdf";
    Storage::disk('equipment-documents')->put($path, "%PDF-1.4\n%%EOF");
    $document = EquipmentVehicleDocument::factory()->for($car)->create([
        'disk' => 'equipment-documents',
        'path' => $path,
    ]);

    $this->actingAs($manager, 'web')
        ->deleteJson("/api/v1/equipment/{$car->id}/vehicle-documents/{$document->id}")
        ->assertNoContent();

    Storage::disk('equipment-documents')->assertMissing($path);
    $this->assertDatabaseMissing('equipment_vehicle_documents', ['id' => $document->id]);
    $this->assertDatabaseHas('equipment_changes', [
        'equipment_id' => $car->id,
        'change_type' => EquipmentChangeType::VehicleDocumentDeleted->value,
    ]);
});

it('does not expose a vehicle document through a different car', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $car = carEquipment();
    $otherCar = Equipment::factory()->for($car->category, 'category')->create();
    $document = EquipmentVehicleDocument::factory()->for($car)->create();

    $this->actingAs($viewer, 'web')
        ->get("/api/v1/equipment/{$otherCar->id}/vehicle-documents/{$document->id}/file")
        ->assertNotFound();
});
