<?php

namespace App\Http\Requests\Subcontracts;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Opening balance of a contract that started before Hourie: what was
 * certified up to the last paper valuation, so the next one continues from it.
 */
class StoreValuationOpeningRequest extends FormRequest
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
            'last_sequence' => ['required', 'integer', 'min:1', 'max:999'],
            'valuation_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'period_end' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'historical_works_amount' => ['required', 'numeric', 'min:0', 'max:9999999999999', 'decimal:0,2'],
            'cash_percent' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'comment' => ['nullable', 'string', 'max:5000'],
            'lines' => ['present', 'array', 'max:200'],
            'lines.*.subcontract_item_id' => ['required', 'integer'],
            'lines.*.cumulative_quantity' => ['required', 'numeric', 'min:0', 'max:999999999999'],
        ];
    }
}
