<?php

namespace App\Http\Requests\Sites;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSiteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role->canManageSites() ?? false;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('projects', 'name')->where('is_active', true)],
            'status' => ['required', Rule::exists('catalog_options', 'code')->where(fn ($query) => $query->where('group', 'project_status')->where('is_active', true))],
            'responsible_employee_id' => ['nullable', 'integer', Rule::exists('employees', 'id')->where('is_active', true)],
            'address' => ['nullable', 'string', 'max:255'],
            'start_date' => ['nullable', 'date'],
            'expected_end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'notes' => ['nullable', 'string'],
            'locations' => ['present', 'array', 'max:20'],
            'locations.*' => ['required', 'string', 'max:255', 'distinct:ignore_case'],
        ];
    }
}
