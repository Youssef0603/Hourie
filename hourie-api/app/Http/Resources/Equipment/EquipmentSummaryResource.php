<?php

namespace App\Http\Resources\Equipment;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EquipmentSummaryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'display_id' => str_pad((string) $this->id, 3, '0', STR_PAD_LEFT),
            'asset_code' => $this->asset_code,
            'category' => $this->whenLoaded('category', fn () => [
                'id' => $this->category->id,
                'code' => $this->category->code,
                'name' => $this->category->name,
            ]),
            'brand' => $this->brand,
            'model' => $this->model,
            'serial_number' => $this->serial_number,
            'registration_number' => $this->registration_number,
            'manufacture_year' => $this->manufacture_year,
            'purchase_date' => $this->purchase_date?->toDateString(),
            'supplier' => $this->supplier,
            'origin' => $this->origin,
            'asset_details' => $this->asset_details,
            'condition' => $this->condition,
            'current_location' => $this->whenLoaded('currentLocation', function (): ?array {
                if ($this->currentLocation === null) {
                    return null;
                }

                return [
                    'id' => $this->currentLocation->id,
                    'name' => $this->currentLocation->name,
                    'parent' => $this->currentLocation->parent === null ? null : [
                        'id' => $this->currentLocation->parent->id,
                        'name' => $this->currentLocation->parent->name,
                    ],
                    'project' => $this->currentLocation->project === null ? null : [
                        'id' => $this->currentLocation->project->id,
                        'name' => $this->currentLocation->project->name,
                    ],
                ];
            }),
            'current_project_assignment' => $this->whenLoaded('currentProjectAssignment', function (): ?array {
                if ($this->currentProjectAssignment === null) {
                    return null;
                }

                return [
                    'id' => $this->currentProjectAssignment->id,
                    'project' => [
                        'id' => $this->currentProjectAssignment->project->id,
                        'name' => $this->currentProjectAssignment->project->name,
                    ],
                ];
            }),
            'custodian' => $this->whenLoaded('custodian', fn () => $this->custodian === null ? null : [
                'id' => $this->custodian->id,
                'name' => $this->custodian->name,
            ]),
            'power' => $this->whenLoaded('generatorDetails', fn () => $this->generatorDetails === null ? null : [
                'apparent_kva' => $this->generatorDetails->apparent_power_kva,
                'active_kw' => $this->generatorDetails->active_power_kw,
            ]),
            'fuel_type' => $this->whenLoaded('generatorDetails', fn () => $this->generatorDetails?->fuel_type),
        ];
    }

}
