<?php

namespace App\Http\Resources\Equipment;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class EquipmentMaintenanceResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'maintenance_date' => $this->maintenance_date?->format('Y-m-d'),
            'engine_hours' => $this->engine_hours,
            'intervention_type' => $this->intervention_type,
            'oil_changed' => $this->oil_changed,
            'oil_quantity_litres' => $this->oil_quantity_litres,
            'oil_filter_changed' => $this->oil_filter_changed,
            'fuel_filter_changed' => $this->fuel_filter_changed,
            'air_filter_changed' => $this->air_filter_changed,
            'battery_serviced' => $this->battery_serviced,
            'coolant_serviced' => $this->coolant_serviced,
            'technician' => $this->whenLoaded('technician', fn () => $this->technician === null ? null : [
                'id' => $this->technician->id,
                'name' => $this->technician->name,
            ]),
            'technician_name' => $this->technician_name,
            'external_technician_phone' => $this->external_technician_phone,
            'next_maintenance_date' => $this->next_maintenance_date?->format('Y-m-d'),
            'cost' => $this->cost,
            'cost_currency' => $this->cost_currency,
            'observations' => $this->observations,
            'created_by' => $this->whenLoaded('createdBy', fn () => [
                'id' => $this->createdBy->id,
                'name' => $this->createdBy->name,
            ]),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
