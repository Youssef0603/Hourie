<?php

namespace App\Http\Requests\Sites;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

class UpdateSiteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role->canManageSites() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $site = $this->route('site');

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('projects', 'name')->ignore($site)],
            'status' => ['required', $this->projectStatusRule()],
            'responsible_employee_id' => ['required', 'integer', Rule::exists('employees', 'id')->where('is_active', true)],
            'address' => ['nullable', 'string', 'max:255'],
            'start_date' => ['nullable', 'date'],
            'expected_end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'notes' => ['nullable', 'string'],
            'locations' => ['required', 'array', 'min:1', 'max:20'],
            'locations.*.id' => ['nullable', 'integer', Rule::exists('locations', 'id')->where(fn ($query) => $query->where('project_id', $site?->id)->whereNotNull('parent_id'))],
            'locations.*.name' => ['required', 'string', 'max:255', 'distinct:ignore_case'],
        ];
    }

    private function projectStatusRule(): Exists
    {
        $currentStatus = $this->route('site')?->status;

        return Rule::exists('catalog_options', 'code')->where(fn ($query) => $query
            ->where('group', 'project_status')
            ->where(fn ($statusQuery) => $statusQuery
                ->where('is_active', true)
                ->when($currentStatus !== null, fn ($activeQuery) => $activeQuery->orWhere('code', $currentStatus))));
    }
}
