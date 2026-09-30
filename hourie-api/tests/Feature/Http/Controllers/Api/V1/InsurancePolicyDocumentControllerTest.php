<?php

use App\Enums\UserRole;
use App\Models\InsurancePolicy;
use App\Models\InsurancePolicyDocument;
use App\Models\User;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(LazilyRefreshDatabase::class);

it('records policy creation and updates in the history', function () {
    $manager = User::factory()->create(['role' => UserRole::Manager]);

    $created = $this->actingAs($manager, 'web')->postJson('/api/v1/insurance-policies', [
        'insurance_type' => 'equipment',
        'policy_number' => 'POL-HISTORY-001',
    ])->assertCreated()
        ->assertJsonPath('data.changes.0.action', 'created')
        ->assertJsonPath('data.changes.0.actor.id', $manager->id);

    $policyId = $created->json('data.id');
    $this->actingAs($manager, 'web')->patchJson("/api/v1/insurance-policies/{$policyId}", [
        'insurance_type' => 'equipment',
        'policy_number' => 'POL-HISTORY-002',
    ])->assertOk()->assertJsonPath('data.changes.0.action', 'updated');

    $this->actingAs($manager, 'web')->getJson("/api/v1/insurance-policies/{$policyId}")
        ->assertOk()
        ->assertJsonPath('data.changes.0.action', 'updated')
        ->assertJsonPath('data.changes.1.action', 'created');
});

it('deletes an insurance policy document and its private file', function () {
    Storage::fake('equipment-documents');
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $policy = InsurancePolicy::query()->create([
        'insurance_type' => 'equipment',
        'policy_number' => 'POL-001',
        'created_by_user_id' => $manager->id,
    ]);
    $path = "insurance/{$policy->id}/documents/policy.pdf";
    Storage::disk('equipment-documents')->put($path, "%PDF-1.4\n%%EOF");
    $document = $policy->documents()->create([
        'uploaded_by_user_id' => $manager->id,
        'disk' => 'equipment-documents',
        'path' => $path,
        'original_name' => 'policy.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => 19,
    ]);

    $this->actingAs($manager, 'web')
        ->deleteJson("/api/v1/insurance-policies/{$policy->id}/documents/{$document->id}")
        ->assertNoContent();

    Storage::disk('equipment-documents')->assertMissing($path);
    $this->assertDatabaseMissing('insurance_policy_documents', ['id' => $document->id]);
    $this->assertDatabaseHas('insurance_policy_changes', [
        'insurance_policy_id' => $policy->id,
        'actor_user_id' => $manager->id,
        'action' => 'document_deleted',
    ]);
});

it('does not delete an insurance document through another policy', function () {
    Storage::fake('equipment-documents');
    $manager = User::factory()->create(['role' => UserRole::Manager]);
    $policy = InsurancePolicy::query()->create(['insurance_type' => 'equipment', 'policy_number' => 'POL-001']);
    $otherPolicy = InsurancePolicy::query()->create(['insurance_type' => 'equipment', 'policy_number' => 'POL-002']);
    $document = InsurancePolicyDocument::query()->create([
        'insurance_policy_id' => $policy->id,
        'disk' => 'equipment-documents',
        'path' => 'insurance/policy.pdf',
        'original_name' => 'policy.pdf',
        'mime_type' => 'application/pdf',
        'size_bytes' => 19,
    ]);

    $this->actingAs($manager, 'web')
        ->deleteJson("/api/v1/insurance-policies/{$otherPolicy->id}/documents/{$document->id}")
        ->assertNotFound();

    $this->assertDatabaseHas('insurance_policy_documents', ['id' => $document->id]);
});
