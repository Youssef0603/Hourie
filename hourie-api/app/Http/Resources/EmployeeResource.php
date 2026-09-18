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
            'phone_number' => $this->phone_number,
            'is_active' => $this->is_active,
            'equipment_in_custody_count' => $this->whenCounted('equipmentInCustody'),
            'user' => $this->whenLoaded('user', fn () => $this->user === null ? null : [
                'id' => $this->user->id,
                'email' => $this->user->email,
                'role' => $this->user->role->value,
            ]),
            'equipment_in_custody' => EquipmentSummaryResource::collection(
                $this->whenLoaded('equipmentInCustody'),
            ),
        ];
    }
}
