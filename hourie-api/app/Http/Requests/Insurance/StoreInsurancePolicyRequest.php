<?php

namespace App\Http\Requests\Insurance;

use App\Models\InsurancePolicy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInsurancePolicyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role->canManageSites() ?? false;
    }

    public function rules(): array
    {
        return [
            'insurance_type' => ['required', 'string', Rule::in(InsurancePolicy::TYPES)],
            'policy_number' => ['required', 'string', 'max:255'],
            'starts_on' => ['nullable', 'date'], 'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
            'net_premium' => ['nullable', 'numeric', 'min:0'], 'accessories_amount' => ['nullable', 'numeric', 'min:0'],
            'tax_amount' => ['nullable', 'numeric', 'min:0'], 'policy_cost' => ['nullable', 'numeric', 'min:0'],
            'total_amount' => ['nullable', 'numeric', 'min:0'], 'coverage_amount' => ['nullable', 'numeric', 'min:0'],
            'invoice_number' => ['nullable', 'string', 'max:255'], 'territory' => ['nullable', 'string', 'max:255'],
            'insured_situation' => ['nullable', 'string', 'max:255'], 'project_id' => ['nullable', 'integer', 'exists:projects,id'], 'source' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'employee_ids' => ['sometimes', 'array'], 'employee_ids.*' => ['integer', 'distinct', 'exists:employees,id'],
            'equipment_ids' => ['sometimes', 'array'], 'equipment_ids.*' => ['integer', 'distinct', 'exists:equipment,id'],
            'chassis_numbers' => ['sometimes', 'array'], 'chassis_numbers.*' => ['string', 'max:255'],
        ];
    }
}
