<?php

namespace App\Policies;

use App\Models\EquipmentMaintenance;
use App\Models\User;

class EquipmentMaintenancePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, EquipmentMaintenance $maintenance): bool
    {
        return true;
    }

    public function create(User $user): bool
    {
        return $user->role->canManageMaintenance();
    }

    public function update(User $user, EquipmentMaintenance $maintenance): bool
    {
        return $user->role->canManageMaintenance()
            && ($maintenance->equipment === null || $user->can('view', $maintenance->equipment));
    }

    public function delete(User $user, EquipmentMaintenance $maintenance): bool
    {
        return $user->role->canDeleteMaintenance();
    }
}
