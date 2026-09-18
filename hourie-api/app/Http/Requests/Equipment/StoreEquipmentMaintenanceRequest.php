<?php

namespace App\Http\Requests\Equipment;

use App\Models\EquipmentMaintenance;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEquipmentMaintenanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', EquipmentMaintenance::class) ?? false;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'maintenance_date' => ['required', 'date'],
            'engine_hours' => ['nullable', 'numeric', 'min:0'],
            'intervention_type' => ['required', Rule::in(['urgent', 'electrical', 'mechanical', 'hydraulic'])],
            'oil_changed' => ['nullable', 'boolean'],
            'oil_quantity_litres' => [
                Rule::requiredIf(fn (): bool => $this->boolean('oil_changed')),
                'nullable',
                'numeric',
                'min:0.01',
            ],
            'oil_filter_changed' => ['nullable', 'boolean'],
            'fuel_filter_changed' => ['nullable', 'boolean'],
            'air_filter_changed' => ['nullable', 'boolean'],
            'battery_serviced' => ['nullable', 'boolean'],
            'coolant_serviced' => ['nullable', 'boolean'],
            'technician_employee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'technician_name' => ['nullable', 'string', 'max:255'],
            'next_maintenance_date' => ['nullable', 'date', 'after_or_equal:maintenance_date'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'cost_currency' => ['nullable', 'string', 'size:3'],
            'observations' => ['nullable', 'string'],
        ];
    }
}
