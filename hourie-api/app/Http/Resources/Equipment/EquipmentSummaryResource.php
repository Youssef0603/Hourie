<?php

namespace App\Http\Resources\Equipment;

use App\Models\EquipmentCategory;
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
            'manufacture_year' => $this->manufacture_year,
            'purchase_date' => $this->purchase_date?->toDateString(),
            'asset_details' => $this->asset_details,
            'condition' => $this->condition,
            'operational_situation' => $this->operational_situation,
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
                        'responsible' => $this->currentProjectAssignment->project->responsible === null ? null : [
                            'id' => $this->currentProjectAssignment->project->responsible->id,
                            'name' => $this->currentProjectAssignment->project->responsible->name,
                        ],
                    ],
                ];
            }),
            'custodian' => $this->whenLoaded('custodian', fn () => $this->custodian === null ? null : [
                'id' => $this->custodian->id,
                'name' => $this->custodian->name,
            ]),
            'responsible' => $this->effectiveResponsible(),
            'responsible_source' => $this->effectiveResponsibleSource(),
            'power' => $this->whenLoaded('generatorDetails', fn () => $this->generatorDetails === null ? null : [
                'apparent_kva' => $this->generatorDetails->apparent_power_kva,
                'active_kw' => $this->generatorDetails->active_power_kw,
            ]),
            'fuel_type' => $this->whenLoaded('generatorDetails', fn () => $this->generatorDetails?->fuel_type),
        ];
    }

    /** @return array{id: int, name: string}|null */
    private function effectiveResponsible(): ?array
    {
        $responsible = $this->custodian
            ?? $this->currentProjectAssignment?->project?->responsible;

        return $responsible === null ? null : [
            'id' => $responsible->id,
            'name' => $responsible->name,
        ];
    }

    private function effectiveResponsibleSource(): ?string
    {
        if ($this->custodian !== null) {
            $categoryCode = $this->category?->code;

            return $categoryCode === 'generator' || ! isset(EquipmentCategory::ASSET_CATEGORIES[$categoryCode])
                ? 'generator'
                : 'asset';
        }

        return $this->currentProjectAssignment?->project?->responsible === null ? null : 'site';
    }
}
