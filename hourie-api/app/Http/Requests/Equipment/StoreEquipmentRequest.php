<?php

namespace App\Http\Requests\Equipment;

use App\Models\Equipment;
use App\Models\EquipmentCategory;
use Illuminate\Validation\Rule;

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
            'brand' => ['required', 'string', 'max:255'],
            'model' => ['nullable', 'string', 'max:255'],
            'category_code' => ['sometimes', 'string', Rule::in(array_keys(EquipmentCategory::ASSET_CATEGORIES))],
            'asset_code' => ['nullable', 'string', 'max:100', 'unique:equipment,asset_code'],
        ];
    }
}
