<?php

namespace App\Http\Requests\Subcontracts;

use App\Models\SubcontractValuationPayment;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreValuationPaymentRequest extends FormRequest
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
            'amount' => ['required', 'numeric', 'gt:0', 'max:9999999999999', 'decimal:0,2'],
            'paid_on' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'method' => ['nullable', 'string', Rule::in(SubcontractValuationPayment::METHODS)],
            'reference' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }
}
