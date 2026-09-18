<?php

namespace App\Http\Resources\Equipment;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

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
            'changes' => $this->whenLoaded('changes', fn () => $this->changes->map(fn ($change) => [
                'id' => $change->id,
                'type' => $change->change_type->value,
                'source' => $change->source->value,
                'actor' => $change->actor === null ? null : ['id' => $change->actor->id, 'name' => $change->actor->name],
                'occurred_at' => $change->occurred_at->toISOString(),
            ])),
        ];
    }
}
