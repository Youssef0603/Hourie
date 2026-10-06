<?php

namespace App\Http\Resources\Equipment;

use App\Enums\EquipmentChangeSource;
use App\Models\Location;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Collection;

class EquipmentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...(new EquipmentSummaryResource($this->resource))->toArray($request),
            'observations' => $this->observations,
            'generator_details' => $this->whenLoaded('generatorDetails', fn () => $this->generatorDetails === null ? null : [
                'apparent_power_kva' => $this->generatorDetails->apparent_power_kva,
                'active_power_kw' => $this->generatorDetails->active_power_kw,
                'phases' => $this->generatorDetails->phases,
                'voltage_rating' => $this->generatorDetails->voltage_rating,
                'frequency_hz' => $this->generatorDetails->frequency_hz,
                'current_rating' => $this->generatorDetails->current_rating,
                'fuel_type' => $this->generatorDetails->fuel_type,
                'tank_capacity_litres' => $this->generatorDetails->tank_capacity_litres,
                'current_engine_hours' => $this->generatorDetails->current_engine_hours,
                'purchase_price_fcfa' => $this->generatorDetails->purchase_price_fcfa,
                'sold_to' => $this->generatorDetails->sold_to,
            ]),
            'maintenances' => EquipmentMaintenanceResource::collection($this->whenLoaded('maintenances')),
            'images' => $this->whenLoaded('images', fn () => $this->images->map(fn ($image) => [
                'id' => $image->id,
                'url' => route('equipment.images.show', [$this->resource, $image], false),
                'original_name' => $image->original_name,
                'mime_type' => $image->mime_type,
                'size_bytes' => $image->size_bytes,
                'created_at' => $image->created_at->toISOString(),
            ])),
            'invoices' => $this->whenLoaded('invoices', fn () => $this->invoices->map(fn ($invoice) => [
                'id' => $invoice->id,
                'url' => route('equipment.invoices.show', [$this->resource, $invoice], false),
                'original_name' => $invoice->original_name,
                'mime_type' => $invoice->mime_type,
                'size_bytes' => $invoice->size_bytes,
                'uploaded_by' => $invoice->uploader === null ? null : [
                    'id' => $invoice->uploader->id,
                    'name' => $invoice->uploader->name,
                ],
                'created_at' => $invoice->created_at->toISOString(),
            ])),
            'insurance_policies' => $this->whenLoaded('insurancePolicies', fn () => $this->insurancePolicies->map(fn ($policy) => [
                'id' => $policy->id,
                'policy_number' => $policy->policy_number,
                'source' => $policy->source,
                'starts_on' => $policy->starts_on?->format('Y-m-d'),
                'ends_on' => $policy->ends_on?->format('Y-m-d'),
                'total_amount' => $policy->total_amount,
                'documents' => $policy->documents->map(fn ($document) => [
                    'id' => $document->id,
                    'url' => "/api/v1/insurance-policies/{$policy->id}/documents/{$document->id}/file",
                    'original_name' => $document->original_name,
                    'mime_type' => $document->mime_type,
                    'size_bytes' => $document->size_bytes,
                ]),
            ])),
            'temporary_admissions' => $this->whenLoaded('temporaryAdmissions', fn () => $this->temporaryAdmissions->map(function ($admission) {
                $renewalCount = $admission->documents->where('document_type', 'renewal')->count();
                $expiresOn = $admission->entered_on?->copy()->addYears($renewalCount + 1);
                $status = in_array($admission->status, ['returned', 'cleared'], true)
                    ? $admission->status
                    : (($expiresOn?->isBefore(now()->startOfDay())) ? 'expired' : $admission->status);

                return [
                    'id' => $admission->id,
                    'customs_reference' => $admission->customs_reference,
                    'entered_on' => $admission->entered_on?->format('Y-m-d'),
                    'expires_on' => $expiresOn?->format('Y-m-d'),
                    'status' => $status,
                    'cleared_on' => $admission->cleared_on?->format('Y-m-d'),
                    'customs_duty_amount' => $admission->customs_duty_amount,
                ];
            })),
            'changes' => $this->whenLoaded('changes', fn () => $this->changesPayload()),
        ];
    }

    /** @return Collection<int, array<string, mixed>> */
    private function changesPayload(): Collection
    {
        $changes = $this->changes;
        $transferIds = $changes
            ->filter(fn ($change): bool => $change->source === EquipmentChangeSource::Transfer)
            ->flatMap(fn ($change) => [
                $change->previous_values['project_id'] ?? null,
                $change->previous_values['location_id'] ?? null,
                $change->new_values['project_id'] ?? null,
                $change->new_values['location_id'] ?? null,
            ])
            ->filter()
            ->unique()
            ->values();
        $projectNames = Project::query()->whereKey($transferIds)->pluck('name', 'id');
        $locationNames = Location::query()->whereKey($transferIds)->pluck('name', 'id');

        return $changes->map(function ($change) use ($projectNames, $locationNames): array {
            $transfer = null;
            if ($change->source === EquipmentChangeSource::Transfer) {
                $previous = $change->previous_values ?? [];
                $next = $change->new_values ?? [];
                $transfer = [
                    'from' => [
                        'project' => $previous['project_name'] ?? $projectNames->get($previous['project_id'] ?? null),
                        'location' => $previous['location_name'] ?? $locationNames->get($previous['location_id'] ?? null),
                    ],
                    'to' => [
                        'project' => $next['project_name'] ?? $projectNames->get($next['project_id'] ?? null),
                        'location' => $next['location_name'] ?? $locationNames->get($next['location_id'] ?? null),
                    ],
                ];
            }

            return [
                'id' => $change->id,
                'type' => $change->change_type->value,
                'source' => $change->source->value,
                'actor' => $change->actor === null ? null : ['id' => $change->actor->id, 'name' => $change->actor->name],
                'occurred_at' => $change->occurred_at->toISOString(),
                'transfer' => $transfer,
            ];
        });
    }
}
