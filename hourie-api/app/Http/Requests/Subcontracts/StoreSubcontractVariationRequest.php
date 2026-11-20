<?php

namespace App\Http\Requests\Subcontracts;

use Illuminate\Foundation\Http\FormRequest;

class StoreSubcontractVariationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role->canManageSubcontracts() ?? false;
    }

    /**
     * Each variation adds quantity to existing work items and/or adds new items.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'reason' => ['nullable', 'string', 'max:5000'],
            'approved_on' => ['required', 'date_format:Y-m-d'],
            'lines' => ['array', 'max:200', 'required_without:new_items'],
            'lines.*.subcontract_item_id' => ['required', 'integer'],
            'lines.*.quantity' => ['required', 'numeric', 'gt:0', 'max:999999999999'],
            'new_items' => ['array', 'max:200', 'required_without:lines'],
            'new_items.*.description' => ['required', 'string', 'max:2000'],
            'new_items.*.unit' => ['required', 'string', 'max:20'],
            'new_items.*.quantity' => ['required', 'numeric', 'gt:0', 'max:999999999999'],
            'new_items.*.unit_price' => ['required', 'numeric', 'min:0', 'max:9999999999999'],
        ];
    }
}
