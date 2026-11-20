<?php

namespace App\Http\Requests\PurchaseOrders;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseOrderInvoiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role->canManagePurchaseOrders() ?? false;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'invoice_number' => ['required', 'string', 'max:255'],
            'invoiced_on' => ['required', 'date_format:Y-m-d'],
            'amount' => ['required', 'numeric', 'min:0', 'max:9999999999999'],
            'invoice_file' => ['required', 'file', 'mimes:pdf', 'extensions:pdf', 'max:10240'],
        ];
    }
}
