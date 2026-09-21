<?php

namespace App\Http\Resources\Equipment;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MaintenanceWarningResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $dueDate = $this->latestMaintenance->next_maintenance_date;
        $daysUntilDue = today()->diffInDays($dueDate, false);

        return [
            'equipment' => (new EquipmentSummaryResource($this->resource))->toArray($request),
            'last_maintenance_date' => $this->latestMaintenance->maintenance_date->format('Y-m-d'),
            'next_maintenance_date' => $dueDate->format('Y-m-d'),
            'days_until_due' => $daysUntilDue,
            'status' => $daysUntilDue < 0 ? 'overdue' : 'due_soon',
        ];
    }
}
