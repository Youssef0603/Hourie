<?php

namespace App\Http\Resources;

use App\Http\Resources\Equipment\EquipmentSummaryResource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EmployeeResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'job_title' => $this->job_title,
            'phone_number' => $this->phone_number,
            'email' => $this->email,
            'passport_number' => $this->passport_number,
            'employment_date' => $this->employment_date?->format('Y-m-d'),
            'birth_date' => $this->birth_date?->format('Y-m-d'),
            'is_active' => $this->is_active,
            'equipment_in_custody_count' => $this->when(
                array_key_exists('equipment_in_custody_count', $this->resource->getAttributes()),
                fn () => (int) $this->equipment_in_custody_count,
            ),
            'user' => $this->whenLoaded('user', fn () => $this->user === null ? null : [
                'id' => $this->user->id,
                'username' => $this->user->username,
                'email' => $this->user->email,
                'role' => $this->user->role->value,
            ]),
            'equipment_in_custody' => EquipmentSummaryResource::collection(
                $this->whenLoaded('equipmentInCustody'),
            ),
            'assigned_sites' => $this->whenLoaded('responsibleProjects', fn () => $this->responsibleProjects
                ->where('is_active', true)
                ->map(fn ($project) => ['id' => $project->id, 'name' => $project->name])
                ->values()),
            'project_assignments' => $this->whenLoaded('projectAssignments', fn () => $this->projectAssignments->map(fn ($assignment) => [
                'id' => $assignment->id,
                'project' => [
                    'id' => $assignment->project->id,
                    'name' => $assignment->project->name,
                ],
                'project_role' => $assignment->project_role,
                'started_on' => $assignment->started_on?->format('Y-m-d'),
                'ended_on' => $assignment->ended_on?->format('Y-m-d'),
            ])->values()),
            'health_insurance_policies' => $this->whenLoaded('insurancePolicies', fn () => $this->insurancePolicies->map(fn ($policy) => [
                'id' => $policy->id,
                'policy_number' => $policy->policy_number,
                'source' => $policy->source,
                'starts_on' => $policy->starts_on?->format('Y-m-d'),
                'ends_on' => $policy->ends_on?->format('Y-m-d'),
            ])),
        ];
    }
}
