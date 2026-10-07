<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InsurancePolicyResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'insurance_type' => $this->insurance_type, 'policy_number' => $this->policy_number,
            'starts_on' => $this->starts_on?->format('Y-m-d'), 'ends_on' => $this->ends_on?->format('Y-m-d'),
            'net_premium' => $this->net_premium, 'accessories_amount' => $this->accessories_amount,
            'tax_amount' => $this->tax_amount, 'policy_cost' => $this->policy_cost, 'total_amount' => $this->total_amount,
            'coverage_amount' => $this->coverage_amount, 'invoice_number' => $this->invoice_number,
            'territory' => $this->territory, 'insured_situation' => $this->insured_situation, 'source' => $this->source,
            'covered_count' => $this->when(
                array_key_exists('employees_count', $this->resource->getAttributes()) || array_key_exists('equipment_count', $this->resource->getAttributes()),
                fn () => $this->insurance_type === 'equipment' ? (int) ($this->equipment_count ?? 0) : (int) ($this->employees_count ?? 0),
            ),
            'project' => $this->whenLoaded('project', fn () => $this->project === null ? null : ['id' => $this->project->id, 'name' => $this->project->name]),
            'notes' => $this->notes,
            'employees' => $this->whenLoaded('employees', fn () => $this->employees->map(fn ($employee) => ['id' => $employee->id, 'name' => $employee->name, 'birth_date' => $employee->birth_date?->format('Y-m-d')])),
            'equipment' => $this->whenLoaded('equipment', fn () => $this->equipment->map(fn ($equipment) => ['id' => $equipment->id, 'asset_code' => $equipment->asset_code, 'brand' => $equipment->brand, 'model' => $equipment->model])),
            'documents' => $this->whenLoaded('documents', fn () => $this->documents->map(fn ($document) => ['id' => $document->id, 'original_name' => $document->original_name, 'mime_type' => $document->mime_type, 'size_bytes' => $document->size_bytes, 'url' => "/api/v1/insurance-policies/{$this->id}/documents/{$document->id}/file"])),
            'changes' => $this->whenLoaded('changes', fn () => $this->changes->map(fn ($change) => [
                'id' => $change->id,
                'action' => $change->action,
                'actor' => $change->actor === null ? null : ['id' => $change->actor->id, 'name' => $change->actor->name],
                'occurred_at' => $change->occurred_at?->toISOString(),
            ])),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
