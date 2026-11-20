<?php

namespace App\Http\Requests\Subcontracts;

use Illuminate\Foundation\Http\FormRequest;

class StoreValuationInvoiceRequest extends FormRequest
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
            'invoice_number' => ['required', 'string', 'max:255'],
            'invoice_date' => ['required', 'date_format:Y-m-d'],
            'invoice_amount' => ['required', 'numeric', 'min:0', 'max:9999999999999'],
            'invoice_file' => ['nullable', 'file', 'mimes:pdf', 'extensions:pdf', 'max:10240'],
        ];
    }
}
