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
        return $user->role->canManageEquipment();
    }

    public function update(User $user, EquipmentMaintenance $maintenance): bool
    {
        return $user->role->canManageEquipment();
    }

    public function delete(User $user, EquipmentMaintenance $maintenance): bool
    {
        return $user->role->canDeleteMaintenance();
    }
}
