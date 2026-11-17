<?php

namespace App\Http\Requests\PurchaseOrders;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role->canManagePurchaseOrders() ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'supplier_name' => ['required', 'string', 'max:255'],
            'supplier_phone' => ['nullable', 'string', 'max:100'],
            'supplier_fax' => ['nullable', 'string', 'max:100'],
            'ordered_on' => ['required', 'date_format:Y-m-d'],
            'follow_up_agent' => ['nullable', 'string', 'max:255'],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'project_name' => ['nullable', 'string', 'max:255'],
            'reason' => ['nullable', 'string', 'max:255'],
            'prepared_by' => ['nullable', 'string', 'max:255'],
            'ordered_by' => ['nullable', 'string', 'max:255'],
            'approved_by' => ['nullable', 'string', 'max:255'],
            'vat_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'currency' => ['required', 'string', 'size:3'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.budget_code' => ['nullable', 'string', 'max:100'],
            'items.*.description' => ['required', 'string', 'max:2000'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0', 'max:999999999'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0', 'max:9999999999999'],
        ];
    }
}
