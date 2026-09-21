<?php

namespace App\Http\Requests\Equipment;

use App\Models\EquipmentMaintenance;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

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
            'intervention_type' => ['required', $this->maintenanceTypeRule()],
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
            'technician_employee_id' => ['nullable', 'integer', Rule::exists('employees', 'id')->where('is_active', true)],
            'technician_name' => ['nullable', 'string', 'max:255'],
            'external_technician_phone' => ['nullable', 'string', 'max:50', 'required_with:technician_name'],
            'next_maintenance_date' => ['nullable', 'date', 'after_or_equal:maintenance_date'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'cost_currency' => ['nullable', 'string', 'size:3'],
            'observations' => ['nullable', 'string'],
        ];
    }

    private function maintenanceTypeRule(): Exists
    {
        $currentType = $this->route('maintenance')?->intervention_type;

        return Rule::exists('catalog_options', 'code')->where(fn ($query) => $query
            ->where('group', 'maintenance_type')
            ->where(fn ($typeQuery) => $typeQuery
                ->where('is_active', true)
                ->when($currentType !== null, fn ($activeQuery) => $activeQuery->orWhere('code', $currentType))));
    }
}
