<?php

namespace App\Policies;

use App\Models\Equipment;
use App\Models\User;

/**
 * Who may see and change equipment. A Chef de chantier only reaches the
 * equipment of the site he is assigned to; everyone else reaches all of it.
 */
class EquipmentPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Equipment $equipment): bool
    {
        return $user->canReachProject($equipment->currentProjectId());
    }

    public function create(User $user): bool
    {
        return $user->role->canCreateEquipment();
    }

    public function update(User $user, Equipment $equipment): bool
    {
        return $user->role->canManageEquipment() && $this->view($user, $equipment);
    }

    /** Record maintenance or a repair on this machine. */
    public function maintain(User $user, Equipment $equipment): bool
    {
        return $user->role->canManageMaintenance() && $this->view($user, $equipment);
    }

    /** Move it to another site. */
    public function transfer(User $user, Equipment $equipment): bool
    {
        return $user->role->canTransferEquipment();
    }

    public function delete(User $user, Equipment $equipment): bool
    {
        return $user->role->canDeleteEquipment();
    }

    public function restore(User $user, Equipment $equipment): bool
    {
        return false;
    }

    public function forceDelete(User $user, Equipment $equipment): bool
    {
        return false;
    }
}
