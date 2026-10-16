<?php

use App\Enums\UserRole;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\TemporaryAdmission;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class);

beforeEach(function (): void {
    $this->user = User::factory()->create(['role' => UserRole::Manager, 'must_change_password' => false, 'is_active' => true]);
    $category = EquipmentCategory::query()->create(['code' => 'test_at', 'name' => 'Test AT', 'is_active' => true]);
    $this->equipment = Equipment::query()->create([
        'equipment_category_id' => $category->id,
        'asset_code' => 'AT-001',
        'brand' => 'Caterpillar',
        'model' => 'D8',
        'serial_number' => 'SER-D8-001',
        'is_active' => true,
    ]);
});

it('lists equipment options by name and serial number', function (): void {
    $this->actingAs($this->user)->getJson('/api/v1/temporary-admission-equipment-options')
        ->assertOk()
        ->assertJsonPath('data.0.name', 'Caterpillar D8')
        ->assertJsonPath('data.0.serial_number', 'SER-D8-001');
});

it('creates a declaration linked to equipment with one year of initial validity', function (): void {
    $response = $this->actingAs($this->user)->postJson('/api/v1/temporary-admissions', [
        'customs_reference' => 'S1445',
        'supplier_name' => 'Caterpillar Export',
        'entered_on' => '2026-10-06',
        'equipment_ids' => [$this->equipment->id],
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.customs_reference', 'S1445')
        ->assertJsonPath('data.supplier_name', 'Caterpillar Export')
        ->assertJsonPath('data.validity_months', 12)
        ->assertJsonPath('data.expires_on', '2027-10-06')
        ->assertJsonPath('data.equipment.0.id', $this->equipment->id)
        ->assertJsonPath('data.equipment.0.serial_number', 'SER-D8-001')
        ->assertJsonPath('data.changes.0.action', 'created')
        ->assertJsonPath('data.changes.0.actor.name', $this->user->name);

    $this->actingAs($this->user)->getJson("/api/v1/temporary-admissions/{$response->json('data.id')}")
        ->assertOk()
        ->assertJsonPath('data.equipment.0.serial_number', 'SER-D8-001')
        ->assertJsonPath('data.changes.0.action', 'created');

    $this->actingAs($this->user)->getJson("/api/v1/equipment/{$this->equipment->id}")
        ->assertOk()
        ->assertJsonPath('data.temporary_admissions.0.customs_reference', 'S1445')
        ->assertJsonPath('data.temporary_admissions.0.validity_months', 12)
        ->assertJsonPath('data.temporary_admissions.0.expires_on', '2027-10-06');
});

it('creates an admission with an unknown entry date and accepts AT documents', function (): void {
    Storage::fake((string) config('filesystems.equipment_documents_disk'));
    $response = $this->actingAs($this->user)->postJson('/api/v1/temporary-admissions', [
        'customs_reference' => 'MATFORCE',
        'supplier_name' => 'MATFORCE',
        'entered_on' => null,
        'equipment_ids' => [$this->equipment->id],
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.entered_on', null)
        ->assertJsonPath('data.expires_on', null);

    $this->actingAs($this->user)->post('/api/v1/temporary-admissions/'.$response->json('data.id').'/documents', [
        'document' => UploadedFile::fake()->create('at-matforce.pdf', 100, 'application/pdf'),
        'document_type' => 'admission',
        'document_date' => '2026-02-25',
        'validity_months' => 12,
    ])->assertCreated()
        ->assertJsonPath('data.entered_on', null)
        ->assertJsonPath('data.expires_on', null)
        ->assertJsonPath('data.documents.0.document_type', 'admission');

    $this->assertDatabaseHas('temporary_admissions', [
        'customs_reference' => 'MATFORCE',
        'entered_on' => null,
    ]);
});

it('paginates admission summaries without covered equipment or documents', function (): void {
    $admission = TemporaryAdmission::query()->create([
        'customs_reference' => 'S-SUMMARY',
        'entered_on' => '2026-10-06',
        'created_by_user_id' => $this->user->id,
    ]);
    $admission->equipment()->attach($this->equipment);

    $this->actingAs($this->user)->getJson('/api/v1/temporary-admissions?per_page=1')
        ->assertOk()
        ->assertJsonPath('meta.per_page', 1)
        ->assertJsonPath('meta.total', 1)
        ->assertJsonPath('data.0.customs_reference', 'S-SUMMARY')
        ->assertJsonMissingPath('data.0.equipment')
        ->assertJsonMissingPath('data.0.documents');
});

it('closes an admission when equipment is returned', function (): void {
    $admission = TemporaryAdmission::query()->create(['customs_reference' => 'S2000', 'entered_on' => '2026-01-01', 'created_by_user_id' => $this->user->id]);
    $admission->equipment()->attach($this->equipment);

    $this->actingAs($this->user)->postJson("/api/v1/temporary-admissions/{$admission->id}/return", [
        'returned_on' => '2026-09-30',
        'closure_reason' => 'Fin du projet',
    ])->assertOk()->assertJsonPath('data.status', 'returned')->assertJsonPath('data.closure_reason', 'Fin du projet');
});

it('marks an admission as cleared when customs duties are paid', function (): void {
    $admission = TemporaryAdmission::query()->create([
        'customs_reference' => 'S2100',
        'entered_on' => '2026-01-01',
        'created_by_user_id' => $this->user->id,
    ]);
    $admission->equipment()->attach($this->equipment);

    $this->actingAs($this->user)->postJson("/api/v1/temporary-admissions/{$admission->id}/clear-customs", [
        'cleared_on' => '2026-09-30',
        'clearance_reference' => 'LIQ-2026-845',
        'customs_duty_amount' => 12500000,
    ])->assertOk()
        ->assertJsonPath('data.status', 'cleared')
        ->assertJsonPath('data.cleared_on', '2026-09-30')
        ->assertJsonPath('data.clearance_reference', 'LIQ-2026-845')
        ->assertJsonPath('data.customs_duty_amount', '12500000.00');
});

it('calculates expiry from the date of the latest AT document', function (): void {
    Storage::fake((string) config('filesystems.equipment_documents_disk'));
    $admission = TemporaryAdmission::query()->create([
        'customs_reference' => 'S3000',
        'entered_on' => '2021-10-12',
        'created_by_user_id' => $this->user->id,
    ]);
    $admission->equipment()->attach($this->equipment);

    $this->actingAs($this->user)->post('/api/v1/temporary-admissions/'.$admission->id.'/documents', [
        'document' => UploadedFile::fake()->create('at-2022.pdf', 100, 'application/pdf'),
        'document_type' => 'admission',
        'document_date' => '2022-10-08',
        'validity_months' => 3,
    ])->assertCreated()
        ->assertJsonPath('data.status', 'expired')
        ->assertJsonPath('data.expires_on', '2023-01-12')
        ->assertJsonPath('data.documents.0.document_type', 'admission');

    $this->actingAs($this->user)->post('/api/v1/temporary-admissions/'.$admission->id.'/documents', [
        'document' => UploadedFile::fake()->create('at-2022-2.pdf', 100, 'application/pdf'),
        'document_type' => 'admission',
        'document_date' => '2022-12-20',
        'validity_months' => 6,
    ])->assertCreated()
        ->assertJsonPath('data.expires_on', '2023-07-12');

    expect($admission->fresh()->status)->toBe('active');
});

it('keeps the initial AT authorization separate without extending the declaration period twice', function (): void {
    $admission = TemporaryAdmission::query()->create([
        'customs_reference' => 'S797',
        'entered_on' => '2021-02-25',
        'created_by_user_id' => $this->user->id,
    ]);
    $admission->documents()->createMany([
        [
            'document_type' => 'admission',
            'document_date' => '2021-02-17',
            'validity_months' => 12,
            'disk' => 'equipment-documents',
            'path' => "temporary-admissions/{$admission->id}/initial-at.pdf",
            'original_name' => 'AT initiale 2021.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 100,
        ],
        [
            'document_type' => 'admission',
            'document_date' => '2022-03-07',
            'validity_months' => 12,
            'disk' => 'equipment-documents',
            'path' => "temporary-admissions/{$admission->id}/renewal-2022.pdf",
            'original_name' => 'AT 2022.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 100,
        ],
    ]);

    $this->actingAs($this->user)->getJson("/api/v1/temporary-admissions/{$admission->id}")
        ->assertOk()
        ->assertJsonPath('data.expires_on', '2023-02-25')
        ->assertJsonCount(2, 'data.documents');
});

it('keeps a later renewal expiry anchored to the declaration date', function (): void {
    $admission = TemporaryAdmission::query()->create([
        'customs_reference' => 'S1404',
        'entered_on' => '2021-06-23',
        'created_by_user_id' => $this->user->id,
    ]);
    $admission->documents()->create([
        'document_type' => 'admission',
        'document_date' => '2023-06-20',
        'validity_months' => 12,
        'disk' => 'equipment-documents',
        'path' => "temporary-admissions/{$admission->id}/at-2023.pdf",
        'original_name' => 'AT 2023.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => 100,
    ]);

    $this->actingAs($this->user)->getJson("/api/v1/temporary-admissions/{$admission->id}")
        ->assertOk()
        ->assertJsonPath('data.expires_on', '2024-06-23');
});

it('updates an admission through the camel-case resource binding', function (): void {
    $admission = TemporaryAdmission::query()->create([
        'customs_reference' => 'S4000',
        'entered_on' => '2026-02-01',
        'created_by_user_id' => $this->user->id,
    ]);
    $admission->equipment()->attach($this->equipment);

    $this->actingAs($this->user)->patchJson('/api/v1/temporary-admissions/'.$admission->id, [
        'customs_reference' => 'S4000-A',
        'supplier_name' => 'Komatsu Trading',
        'entered_on' => '2026-02-01',
        'equipment_ids' => [$this->equipment->id],
        'notes' => 'Dossier corrigé',
    ])->assertOk()
        ->assertJsonPath('data.customs_reference', 'S4000-A')
        ->assertJsonPath('data.supplier_name', 'Komatsu Trading')
        ->assertJsonPath('data.notes', 'Dossier corrigé');
});

it('only accepts positive reasonable AT validity periods', function (): void {
    Storage::fake((string) config('filesystems.equipment_documents_disk'));
    $admission = TemporaryAdmission::query()->create([
        'customs_reference' => 'S5000',
        'entered_on' => '2026-10-06',
        'created_by_user_id' => $this->user->id,
    ]);

    $this->actingAs($this->user)->post('/api/v1/temporary-admissions/'.$admission->id.'/documents', [
        'document' => UploadedFile::fake()->create('at-invalid.pdf', 100, 'application/pdf'),
        'document_type' => 'admission',
        'document_date' => '2027-10-06',
        'validity_months' => 0,
    ])->assertUnprocessable()->assertJsonValidationErrors('validity_months');
});
