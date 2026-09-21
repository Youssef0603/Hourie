<?php

namespace App\Http\Requests\Equipment;

use App\Models\Equipment;
use App\Models\Location;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;
use Illuminate\Validation\Validator;

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
            'manufacture_year' => ['present', 'nullable', 'integer', 'min:1900', 'max:'.((int) date('Y') + 1)],
            'condition' => ['present', 'nullable', $this->activeCatalogOption('equipment_condition')],
            'operational_situation' => ['present', 'nullable', $this->activeCatalogOption('operational_situation')],
            'project_id' => ['sometimes', 'nullable', 'integer', Rule::exists('projects', 'id')->where('is_active', true)],
            'current_location_id' => ['sometimes', 'nullable', 'integer', Rule::exists('locations', 'id')->where('is_active', true)],
            'custodian_employee_id' => ['present', 'nullable', 'integer', Rule::exists('employees', 'id')->where('is_active', true)],
            'observations' => ['present', 'nullable', 'string'],
            'generator_details' => ['required', 'array'],
            'generator_details.apparent_power_kva' => ['present', 'nullable', 'numeric', 'min:0'],
            'generator_details.active_power_kw' => ['present', 'nullable', 'numeric', 'min:0'],
            'generator_details.phases' => ['present', 'nullable', 'string', 'max:50'],
            'generator_details.voltage_rating' => ['present', 'nullable', 'string', 'max:100'],
            'generator_details.frequency_hz' => ['present', 'nullable', 'numeric', 'min:0'],
            'generator_details.current_rating' => ['present', 'nullable', 'string', 'max:100'],
            'generator_details.fuel_type' => ['present', 'nullable', $this->activeCatalogOption('fuel_type')],
            'generator_details.tank_capacity_litres' => ['present', 'nullable', 'numeric', 'min:0'],
            'generator_details.current_engine_hours' => ['present', 'nullable', 'numeric', 'min:0'],
        ];
    }

    /** @return array<int, callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->hasAny(['project_id', 'current_location_id'])) {
                return;
            }

            $equipment = $this->route('equipment');
            $currentProjectId = $equipment instanceof Equipment
                ? $equipment->currentProjectAssignment()->value('project_id')
                : null;
            $currentLocationId = $equipment instanceof Equipment ? $equipment->current_location_id : null;
            $projectId = $this->exists('project_id') ? $this->input('project_id') : $currentProjectId;
            $locationId = $this->exists('current_location_id') ? $this->input('current_location_id') : $currentLocationId;

            if ($locationId === null) {
                return;
            }

            $locationProjectId = Location::query()->whereKey($locationId)->value('project_id');
            if ($projectId === null || (int) $locationProjectId !== (int) $projectId) {
                $validator->errors()->add('current_location_id', __('validation.equipment_location_project_mismatch'));
            }
        }];
    }

    private function activeCatalogOption(string $group): Exists
    {
        $equipment = $this->route('equipment');
        $currentCode = $equipment instanceof Equipment ? match ($group) {
            'equipment_condition' => $equipment->condition,
            'operational_situation' => $equipment->operational_situation,
            'fuel_type' => $equipment->generatorDetails()->value('fuel_type'),
            default => null,
        } : null;

        return Rule::exists('catalog_options', 'code')
            ->where(fn ($query) => $query
                ->where('group', $group)
                ->where(fn ($optionQuery) => $optionQuery
                    ->where('is_active', true)
                    ->when($currentCode !== null, fn ($activeQuery) => $activeQuery->orWhere('code', $currentCode))));
    }
}
