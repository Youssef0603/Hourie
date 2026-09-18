<?php

namespace App\Http\Resources;

use App\Enums\UserRole;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
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
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role->value,
            'employee' => $this->whenLoaded('employee', fn () => $this->employee === null ? null : [
                'id' => $this->employee->id,
                'name' => $this->employee->name,
            ]),
            'permissions' => [
                'manage_equipment' => $this->role->canManageEquipment(),
                'manage_maintenance' => $this->role->canManageEquipment(),
                'delete_maintenance' => $this->role->canDeleteMaintenance(),
                'manage_sites' => $this->role->canManageSites(),
                'manage_users' => $this->role === UserRole::Manager,
            ],
        ];
    }
}
