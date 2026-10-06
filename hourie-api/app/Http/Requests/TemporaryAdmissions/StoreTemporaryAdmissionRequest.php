<?php

namespace App\Http\Requests\TemporaryAdmissions;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreTemporaryAdmissionRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->role->canManageEquipment() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'customs_reference' => ['required', 'string', 'max:255', 'unique:temporary_admissions,customs_reference'],
            'entered_on' => ['required', 'date'],
            'equipment_ids' => ['required', 'array', 'min:1'],
            'equipment_ids.*' => ['integer', 'distinct', 'exists:equipment,id'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }
}
