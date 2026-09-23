<?php

namespace App\Http\Requests\Equipment;

use App\Models\Equipment;
use App\Models\Location;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class TransferEquipmentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('equipment')) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'from_project_id' => ['present', 'nullable', 'integer', 'exists:projects,id'],
            'to_project_id' => ['required', 'integer', Rule::exists('projects', 'id')->where('is_active', true)],
            'to_location_id' => ['required', 'integer', Rule::exists('locations', 'id')->where('is_active', true)],
        ];
    }

    /** @return array<int, callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $equipment = $this->route('equipment');
            $currentProjectId = $equipment instanceof Equipment
                ? $equipment->currentProjectAssignment()->value('project_id')
                : null;
            $fromProjectId = $this->input('from_project_id');
            $toProjectId = (int) $this->input('to_project_id');

            if (($fromProjectId === null ? null : (int) $fromProjectId) !== ($currentProjectId === null ? null : (int) $currentProjectId)) {
                $validator->errors()->add('from_project_id', __('validation.transfer_source_changed'));
            }

            if ($currentProjectId !== null && $toProjectId === (int) $currentProjectId) {
                $validator->errors()->add('to_project_id', __('validation.transfer_destination_same'));
            }

            $locationId = $this->input('to_location_id');
            if ($locationId !== null && (int) Location::query()->whereKey($locationId)->value('project_id') !== $toProjectId) {
                $validator->errors()->add('to_location_id', __('validation.equipment_location_project_mismatch'));
            }
        }];
    }
}
