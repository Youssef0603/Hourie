<?php

namespace App\Http\Requests\Equipment;

use App\Enums\EquipmentCondition;
use App\Enums\OperationalSituation;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEquipmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('equipment')) ?? false;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'brand' => ['present', 'nullable', 'string', 'max:255'],
            'model' => ['present', 'nullable', 'string', 'max:255'],
            'serial_number' => ['present', 'nullable', 'string', 'max:255'],
            'purchase_year' => ['present', 'nullable', 'integer', 'min:1900', 'max:'.((int) date('Y') + 1)],
            'condition' => ['present', 'nullable', Rule::enum(EquipmentCondition::class)],
            'operational_situation' => ['present', 'nullable', Rule::enum(OperationalSituation::class)],
            'custodian_employee_id' => ['present', 'nullable', 'integer', 'exists:employees,id'],
            'observations' => ['present', 'nullable', 'string'],
            'generator_details' => ['required', 'array'],
            'generator_details.apparent_power_kva' => ['present', 'nullable', 'numeric', 'min:0'],
            'generator_details.active_power_kw' => ['present', 'nullable', 'numeric', 'min:0'],
            'generator_details.phases' => ['present', 'nullable', 'string', 'max:50'],
            'generator_details.voltage_rating' => ['present', 'nullable', 'string', 'max:100'],
            'generator_details.frequency_hz' => ['present', 'nullable', 'numeric', 'min:0'],
            'generator_details.current_rating' => ['present', 'nullable', 'string', 'max:100'],
            'generator_details.fuel_type' => ['present', 'nullable', 'string', 'max:100'],
            'generator_details.tank_capacity_litres' => ['present', 'nullable', 'numeric', 'min:0'],
            'generator_details.current_engine_hours' => ['present', 'nullable', 'numeric', 'min:0'],
        ];
    }
}
