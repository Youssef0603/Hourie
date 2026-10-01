<?php

use App\Enums\UserRole;
use App\Models\Bond;
use App\Models\Location;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class);

it('creates and lists a bond linked to a site', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $site = Project::factory()->create();
    $siteRoot = Location::factory()->for($site)->create(['parent_id' => null, 'location_type' => 'project_site']);
    $location = Location::factory()->for($site)->for($siteRoot, 'parent')->create(['name' => 'Lot 1', 'location_type' => 'project_area']);

    $this->actingAs($manager, 'web')->postJson('/api/v1/bonds', [
        'project_id' => $site->id,
        'location_id' => $location->id,
        'bond_type' => 'performance',
        'issuer' => 'Banque Atlantique',
        'amount' => 12000000,
        'currency' => 'XOF',
        'issued_on' => '2026-01-15',
        'expires_on' => '2027-01-15',
    ])->assertCreated()
        ->assertJsonPath('data.project.id', $site->id)
        ->assertJsonPath('data.location.name', 'Lot 1')
        ->assertJsonPath('data.issuer', 'Banque Atlantique')
        ->assertJsonPath('data.bond_type', 'performance')
        ->assertJsonPath('data.amount', '12000000.00')
        ->assertJsonPath('data.changes.0.action', 'created')
        ->assertJsonPath('data.changes.0.actor.id', $manager->id);

    $this->actingAs($manager, 'web')->getJson('/api/v1/bonds')
        ->assertOk()
        ->assertJsonPath('data.0.bond_type', 'performance');

    $bond = Bond::query()->firstOrFail();
    $this->actingAs($manager, 'web')->patchJson("/api/v1/bonds/{$bond->id}", [
        'project_id' => $site->id,
        'location_id' => $location->id,
        'bond_type' => 'retention',
        'issuer' => 'SGCI',
        'amount' => 3000000,
        'currency' => 'XOF',
    ])->assertOk()->assertJsonPath('data.changes.0.action', 'updated');
});

it('requires the physical location to belong to the selected site', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $site = Project::factory()->create();
    $otherSite = Project::factory()->create();
    $otherRoot = Location::factory()->for($otherSite)->create(['parent_id' => null, 'location_type' => 'project_site']);
    $otherLocation = Location::factory()->for($otherSite)->for($otherRoot, 'parent')->create(['location_type' => 'project_area']);

    $this->actingAs($manager, 'web')->postJson('/api/v1/bonds', [
        'project_id' => $site->id,
        'location_id' => $otherLocation->id,
        'bond_type' => 'performance',
        'amount' => 1000,
        'currency' => 'XOF',
    ])->assertUnprocessable()->assertJsonValidationErrors('location_id');
});

it('validates the bond type, site, dates and currency', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);

    $this->actingAs($manager, 'web')->postJson('/api/v1/bonds', [
        'project_id' => 999999,
        'bond_type' => 'unknown',
        'amount' => 1000,
        'currency' => 'GBP',
        'issued_on' => '2027-01-01',
        'expires_on' => '2026-01-01',
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['project_id', 'bond_type', 'currency', 'expires_on']);
});

it('uploads and deletes private bond documents', function () {
    Storage::fake('equipment-documents');
    $manager = User::factory()->create(['role' => UserRole::CmsManager]);
    $bond = Bond::query()->create([
        'project_id' => Project::factory()->create()->id,
        'bond_type' => 'performance',
        'amount' => 1000,
        'currency' => 'XOF',
    ]);
    $file = UploadedFile::fake()->createWithContent('garantie.pdf', "%PDF-1.4\n%%EOF");

    $response = $this->actingAs($manager, 'web')->postJson("/api/v1/bonds/{$bond->id}/documents", [
        'documents' => [$file],
    ])->assertCreated()->assertJsonPath('data.0.original_name', 'garantie.pdf');

    $document = $bond->documents()->firstOrFail();
    Storage::disk('equipment-documents')->assertExists($document->path);

    $this->actingAs($manager, 'web')
        ->deleteJson("/api/v1/bonds/{$bond->id}/documents/{$response->json('data.0.id')}")
        ->assertNoContent();

    Storage::disk('equipment-documents')->assertMissing($document->path);
    $this->assertDatabaseMissing('bond_documents', ['id' => $document->id]);
});

it('keeps a shared document when it is removed from only one caution', function () {
    Storage::fake('equipment-documents');
    $manager = User::factory()->create(['role' => UserRole::CmsManager]);
    $site = Project::factory()->create();
    $firstBond = Bond::query()->create(['project_id' => $site->id, 'bond_type' => 'advance_payment', 'amount' => 1000, 'currency' => 'XOF']);
    $secondBond = Bond::query()->create(['project_id' => $site->id, 'bond_type' => 'performance', 'amount' => 500, 'currency' => 'XOF']);
    $path = "bonds/{$firstBond->id}/documents/shared.pdf";
    Storage::disk('equipment-documents')->put($path, 'shared document');
    $document = $firstBond->documents()->create([
        'disk' => 'equipment-documents',
        'path' => $path,
        'original_name' => 'Garanties communes.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => 15,
    ]);
    $secondBond->documents()->attach($document);

    $this->actingAs($manager, 'web')
        ->deleteJson("/api/v1/bonds/{$firstBond->id}/documents/{$document->id}")
        ->assertNoContent();

    Storage::disk('equipment-documents')->assertExists($path);
    $this->assertDatabaseHas('bond_documents', ['id' => $document->id]);
    $this->assertDatabaseMissing('bond_document_links', ['bond_id' => $firstBond->id, 'bond_document_id' => $document->id]);
    $this->assertDatabaseHas('bond_document_links', ['bond_id' => $secondBond->id, 'bond_document_id' => $document->id]);
});

it('prevents viewers from changing bonds', function () {
    $viewer = User::factory()->create(['role' => UserRole::Viewer]);
    $site = Project::factory()->create();
    $bond = Bond::query()->create(['project_id' => $site->id, 'bond_type' => 'performance', 'amount' => 1000, 'currency' => 'XOF']);

    $this->actingAs($viewer, 'web')->postJson('/api/v1/bonds', [
        'project_id' => $site->id,
        'bond_type' => 'performance',
        'amount' => 1000,
        'currency' => 'XOF',
    ])->assertForbidden();

    $this->actingAs($viewer, 'web')->deleteJson("/api/v1/bonds/{$bond->id}")->assertForbidden();
});
