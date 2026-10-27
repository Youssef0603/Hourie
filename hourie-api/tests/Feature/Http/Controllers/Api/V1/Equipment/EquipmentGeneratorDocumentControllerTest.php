<?php

use App\Enums\EquipmentChangeType;
use App\Enums\UserRole;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\EquipmentGeneratorDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class);

function fakeGeneratorDocumentPdf(string $name = 'plan-entretien.pdf'): UploadedFile
{
    return UploadedFile::fake()->createWithContent($name, "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF");
}

function generatorEquipment(): Equipment
{
    $category = EquipmentCategory::factory()->create(['code' => 'generator', 'name' => 'Générateurs']);

    return Equipment::factory()->for($category, 'category')->create();
}

it('allows equipment managers to upload generator documents and audits the upload', function () {
    Storage::fake('equipment-documents');
    $manager = User::factory()->create(['role' => UserRole::CmsManager]);
    $generator = generatorEquipment();

    $response = $this->actingAs($manager, 'web')
        ->postJson("/api/v1/equipment/{$generator->id}/generator-documents", [
            'documents' => [
                fakeGeneratorDocumentPdf('entretien-essentiel.pdf'),
                fakeGeneratorDocumentPdf('manuel-moteur.pdf'),
            ],
        ]);

    $response
        ->assertCreated()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.original_name', 'entretien-essentiel.pdf')
        ->assertJsonPath('data.0.uploaded_by.id', $manager->id);

    $document = EquipmentGeneratorDocument::query()->firstOrFail();
    Storage::disk('equipment-documents')->assertExists($document->path);
    $this->assertDatabaseCount('equipment_generator_documents', 2);
    $this->assertDatabaseHas('equipment_changes', [
        'equipment_id' => $generator->id,
        'change_type' => EquipmentChangeType::GeneratorDocumentAdded->value,
    ]);
});

it('shows generator documents in details and lets authenticated users open them', function () {
    Storage::fake('equipment-documents');
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $generator = generatorEquipment();
    $path = "equipment/{$generator->id}/generator-documents/plan-entretien.pdf";
    Storage::disk('equipment-documents')->put($path, "%PDF-1.4\n%%EOF");
    $document = EquipmentGeneratorDocument::factory()->for($generator)->create([
        'disk' => 'equipment-documents',
        'path' => $path,
        'original_name' => 'plan-entretien.pdf',
    ]);

    $this->actingAs($viewer, 'web')
        ->getJson("/api/v1/equipment/{$generator->id}")
        ->assertOk()
        ->assertJsonPath('data.generator_documents.0.id', $document->id)
        ->assertJsonPath('data.generator_documents.0.original_name', 'plan-entretien.pdf');

    $this->actingAs($viewer, 'web')
        ->get("/api/v1/equipment/{$generator->id}/generator-documents/{$document->id}/file?preview=1")
        ->assertOk()
        ->assertHeader('content-type', 'application/pdf')
        ->assertHeader('content-disposition', 'inline; filename=plan-entretien.pdf')
        ->assertHeader('x-content-type-options', 'nosniff');
});

it('rejects invalid files and documents attached to non-generator equipment', function () {
    Storage::fake('equipment-documents');
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $generator = generatorEquipment();

    $this->actingAs($manager, 'web')
        ->postJson("/api/v1/equipment/{$generator->id}/generator-documents", [
            'documents' => [UploadedFile::fake()->image('document.jpg')],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('documents.0');

    $equipment = Equipment::factory()->create();

    $this->actingAs($manager, 'web')
        ->postJson("/api/v1/equipment/{$equipment->id}/generator-documents", [
            'documents' => [fakeGeneratorDocumentPdf()],
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('documents');
});

it('prevents viewers from uploading or deleting generator documents', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $generator = generatorEquipment();
    $document = EquipmentGeneratorDocument::factory()->for($generator)->create();

    $this->actingAs($viewer, 'web')
        ->postJson("/api/v1/equipment/{$generator->id}/generator-documents", [
            'documents' => [fakeGeneratorDocumentPdf()],
        ])
        ->assertForbidden();

    $this->actingAs($viewer, 'web')
        ->deleteJson("/api/v1/equipment/{$generator->id}/generator-documents/{$document->id}")
        ->assertForbidden();
});

it('deletes generator document files and records the audit event', function () {
    Storage::fake('equipment-documents');
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $generator = generatorEquipment();
    $path = "equipment/{$generator->id}/generator-documents/plan-entretien.pdf";
    Storage::disk('equipment-documents')->put($path, "%PDF-1.4\n%%EOF");
    $document = EquipmentGeneratorDocument::factory()->for($generator)->create([
        'disk' => 'equipment-documents',
        'path' => $path,
    ]);

    $this->actingAs($manager, 'web')
        ->deleteJson("/api/v1/equipment/{$generator->id}/generator-documents/{$document->id}")
        ->assertNoContent();

    Storage::disk('equipment-documents')->assertMissing($path);
    $this->assertDatabaseMissing('equipment_generator_documents', ['id' => $document->id]);
    $this->assertDatabaseHas('equipment_changes', [
        'equipment_id' => $generator->id,
        'change_type' => EquipmentChangeType::GeneratorDocumentDeleted->value,
    ]);
});

it('does not expose a generator document through a different generator', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $generator = generatorEquipment();
    $otherGenerator = Equipment::factory()->for($generator->category, 'category')->create();
    $document = EquipmentGeneratorDocument::factory()->for($generator)->create();

    $this->actingAs($viewer, 'web')
        ->get("/api/v1/equipment/{$otherGenerator->id}/generator-documents/{$document->id}/file")
        ->assertNotFound();
});
