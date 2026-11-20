<?php

namespace App\Http\Requests\Subcontracts;

use Illuminate\Foundation\Http\FormRequest;

class SaveSubcontractValuationRequest extends FormRequest
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
            'valuation_date' => ['required', 'date_format:Y-m-d'],
            'period_end' => ['required', 'date_format:Y-m-d'],
            'materials_deduction' => ['required', 'numeric', 'min:0', 'max:9999999999999'],
            'backcharges' => ['required', 'numeric', 'min:0', 'max:9999999999999'],
            'comment' => ['nullable', 'string', 'max:5000'],
            'lines' => ['present', 'array', 'max:200'],
            'lines.*.subcontract_item_id' => ['required', 'integer'],
            'lines.*.cumulative_quantity' => ['required', 'numeric', 'min:0', 'max:999999999999'],
        ];
    }
}
