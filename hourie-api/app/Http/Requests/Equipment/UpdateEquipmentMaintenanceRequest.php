<?php

namespace App\Http\Requests\Equipment;

class UpdateEquipmentMaintenanceRequest extends StoreEquipmentMaintenanceRequest
{
    public function authorize(): bool
    {
        $maintenance = $this->route('maintenance');

        return $maintenance !== null
            && ($this->user()?->can('update', $maintenance) ?? false);
    }
}
