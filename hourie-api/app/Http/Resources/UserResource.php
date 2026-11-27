<?php

namespace App\Http\Resources;

use App\Models\Project;
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
            'username' => $this->username,
            'email' => $this->email,
            'role' => $this->role->value,
            'must_change_password' => $this->must_change_password,
            'employee' => $this->whenLoaded('employee', fn () => $this->employee === null ? null : [
                'id' => $this->employee->id,
                'name' => $this->employee->name,
            ]),
            'permissions' => [
                'manage_equipment' => $this->role->canManageEquipment(),
                'create_equipment' => $this->role->canCreateEquipment(),
                'transfer_equipment' => $this->role->canTransferEquipment(),
                'manage_maintenance' => $this->role->canManageMaintenance(),
                'delete_maintenance' => $this->role->canDeleteMaintenance(),
                'delete_equipment' => $this->role->canDeleteEquipment(),
                'manage_temporary_admissions' => $this->role->canManageTemporaryAdmissions(),
                'manage_sites' => $this->role->canManageSites(),
                'manage_purchase_orders' => $this->role->canManagePurchaseOrders(),
                'manage_subcontracts' => $this->role->canManageSubcontracts(),
                'manage_users' => $this->role->canManageUsers(),
                'manage_manager_accounts' => $this->role->canManageManagerAccounts(),
            ],
            // A Chef de chantier works on one site only: the app shows just its equipment.
            'site_scope' => $this->role->isSiteScoped() ? $this->siteScope() : null,
            'features' => [
                'subcontracts' => (bool) config('hourie-features.subcontracts'),
            ],
        ];
    }

    /** @return array{id: int|null, name: string|null} */
    private function siteScope(): array
    {
        $projectId = $this->resource->assignedProjectId();

        return [
            'id' => $projectId,
            'name' => $projectId === null ? null : Project::query()->whereKey($projectId)->value('name'),
        ];
    }
}
