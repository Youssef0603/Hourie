<?php

namespace App\Http\Requests\Equipment;

use App\Models\Equipment;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ListEquipmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('viewAny', Equipment::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:50', 'exists:equipment_categories,code'],
            'condition' => ['nullable', Rule::exists('catalog_options', 'code')->where('group', 'equipment_condition')],
            'operational_situation' => ['nullable', Rule::exists('catalog_options', 'code')->where('group', 'operational_situation')],
            'project_id' => ['nullable', 'integer', 'exists:projects,id'],
            'location_id' => ['nullable', 'integer', 'exists:locations,id'],
            'custodian_employee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'brand' => ['nullable', 'string', 'max:100'],
            'model' => ['nullable', 'string', 'max:100'],
            'serial_number' => ['nullable', 'string', 'max:255'],
            'manufacture_year_from' => ['nullable', 'integer', 'min:1900', 'max:2100'],
            'manufacture_year_to' => ['nullable', 'integer', 'min:1900', 'max:2100', 'gte:manufacture_year_from'],
            'created_from' => ['nullable', 'date_format:Y-m-d'],
            'created_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:created_from'],
            'apparent_power_kva_min' => ['nullable', 'numeric', 'min:0'],
            'apparent_power_kva_max' => ['nullable', 'numeric', 'min:0', 'gte:apparent_power_kva_min'],
            'active_power_kw_min' => ['nullable', 'numeric', 'min:0'],
            'active_power_kw_max' => ['nullable', 'numeric', 'min:0', 'gte:active_power_kw_min'],
            'frequency_hz_min' => ['nullable', 'numeric', 'min:0'],
            'frequency_hz_max' => ['nullable', 'numeric', 'min:0', 'gte:frequency_hz_min'],
            'engine_hours_min' => ['nullable', 'numeric', 'min:0'],
            'engine_hours_max' => ['nullable', 'numeric', 'min:0', 'gte:engine_hours_min'],
            'tank_capacity_litres_min' => ['nullable', 'numeric', 'min:0'],
            'tank_capacity_litres_max' => ['nullable', 'numeric', 'min:0', 'gte:tank_capacity_litres_min'],
            'phases' => ['nullable', 'string', 'max:50'],
            'voltage_rating' => ['nullable', 'string', 'max:100'],
            'current_rating' => ['nullable', 'string', 'max:100'],
            'fuel_type' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'sort' => ['nullable', Rule::in([
                'created_at_desc',
                'created_at_asc',
                'manufacture_year_desc',
                'manufacture_year_asc',
            ])],
        ];
    }
}
