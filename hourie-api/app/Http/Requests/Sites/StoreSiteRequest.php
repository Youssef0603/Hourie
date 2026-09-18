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
            'name' => ['required', 'string', 'max:255', 'unique:projects,name'],
            'status' => ['required', Rule::exists('catalog_options', 'code')->where('group', 'project_status')],
            'address' => ['nullable', 'string', 'max:255'],
            'start_date' => ['nullable', 'date'],
            'expected_end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'notes' => ['nullable', 'string'],
            'locations' => ['required', 'array', 'min:1', 'max:20'],
            'locations.*' => ['required', 'string', 'max:255', 'distinct:ignore_case'],
        ];
    }
}
