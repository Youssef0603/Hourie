<?php

namespace App\Http\Requests\Subcontracts;

use App\Rules\ProjectHasCostCode;
use Illuminate\Foundation\Http\FormRequest;

class SaveSubcontractRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role->canManageSubcontracts() ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'subcontractor_id' => ['required', 'integer', 'exists:subcontractors,id'],
            'project_id' => ['required', 'integer', 'exists:projects,id', new ProjectHasCostCode],
            'title' => ['required', 'string', 'max:255'],
            'signed_on' => ['nullable', 'date_format:Y-m-d'],
            'vat_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'retention_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'advance_amount' => ['required', 'numeric', 'min:0', 'max:9999999999999'],
            'advance_recovery_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'employer_name' => ['nullable', 'string', 'max:255'],
            'engineer_name' => ['nullable', 'string', 'max:255'],
            'cash_percent' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'recurring_deduction_label' => ['nullable', 'string', 'max:255'],
            'recurring_deduction_amount' => ['sometimes', 'numeric', 'min:0', 'max:9999999999999'],
            'currency' => ['required', 'string', 'size:3'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.id' => ['nullable', 'integer'],
            'items.*.description' => ['required', 'string', 'max:2000'],
            'items.*.unit' => ['required', 'string', 'max:20'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0', 'max:999999999999'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0', 'max:9999999999999'],
            'items.*.materials_supplied_by' => ['sometimes', 'string', 'in:subcontractor,arh'],
            'items.*.materials' => ['sometimes', 'array', 'max:20'],
            'items.*.materials.*.id' => ['nullable', 'integer'],
            'items.*.materials.*.name' => ['required', 'string', 'max:255'],
            'items.*.materials.*.unit' => ['required', 'string', 'max:20'],
            'items.*.materials.*.quantity_per_unit' => ['required', 'numeric', 'gt:0', 'max:999999'],
            'items.*.materials.*.waste_percent' => ['required', 'numeric', 'min:0', 'max:100'],
        ];
    }
}
