<?php

namespace App\Http\Requests\Equipment;

use App\Models\Equipment;

class StoreEquipmentRequest extends UpdateEquipmentRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Equipment::class) ?? false;
    }

    public function rules(): array
    {
        return [
            ...parent::rules(),
            'asset_code' => ['nullable', 'string', 'max:100', 'unique:equipment,asset_code'],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'current_location_id' => ['nullable', 'integer', 'exists:locations,id'],
        ];
    }
}
