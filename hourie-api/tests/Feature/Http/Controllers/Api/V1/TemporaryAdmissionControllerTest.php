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
        'asset_details' => ['chassis_number' => 'CAT-D8-001'],
        'is_active' => true,
    ]);
});

it('lists equipment options by name and chassis number', function (): void {
    $this->actingAs($this->user)->getJson('/api/v1/temporary-admission-equipment-options')
        ->assertOk()
        ->assertJsonPath('data.0.name', 'Caterpillar D8')
        ->assertJsonPath('data.0.chassis_number', 'CAT-D8-001');
});

it('creates an admission linked to equipment with a one year validity', function (): void {
    $response = $this->actingAs($this->user)->postJson('/api/v1/temporary-admissions', [
        'customs_reference' => 'S1445',
        'entered_on' => '2026-10-06',
        'equipment_ids' => [$this->equipment->id],
    ]);

    $response->assertCreated()->assertJsonPath('data.customs_reference', 'S1445')->assertJsonPath('data.expires_on', '2027-10-06')->assertJsonPath('data.equipment.0.id', $this->equipment->id);

    $this->actingAs($this->user)->getJson("/api/v1/equipment/{$this->equipment->id}")
        ->assertOk()
        ->assertJsonPath('data.temporary_admissions.0.customs_reference', 'S1445')
        ->assertJsonPath('data.temporary_admissions.0.expires_on', '2027-10-06');
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

it('extends expiry from the original entrance-date anniversary for each renewal', function (): void {
    Storage::fake((string) config('filesystems.equipment_documents_disk'));
    $admission = TemporaryAdmission::query()->create([
        'customs_reference' => 'S3000',
        'entered_on' => '2021-10-12',
        'created_by_user_id' => $this->user->id,
    ]);
    $admission->equipment()->attach($this->equipment);

    $this->actingAs($this->user)->post('/api/v1/temporary-admissions/'.$admission->id.'/documents', [
        'document' => UploadedFile::fake()->create('renewal.pdf', 100, 'application/pdf'),
        'document_type' => 'renewal',
        'document_date' => '2022-10-08',
    ])->assertCreated()
        ->assertJsonPath('data.status', 'expired')
        ->assertJsonPath('data.expires_on', '2023-10-12')
        ->assertJsonPath('data.documents.0.document_type', 'renewal');

    expect($admission->fresh()->status)->toBe('renewed');
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
        'entered_on' => '2026-02-01',
        'equipment_ids' => [$this->equipment->id],
        'notes' => 'Dossier corrigé',
    ])->assertOk()
        ->assertJsonPath('data.customs_reference', 'S4000-A')
        ->assertJsonPath('data.notes', 'Dossier corrigé');
});
