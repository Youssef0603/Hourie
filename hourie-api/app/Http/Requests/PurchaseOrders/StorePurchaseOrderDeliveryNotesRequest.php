<?php

namespace App\Http\Requests\PurchaseOrders;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseOrderDeliveryNotesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role->canManagePurchaseOrders() ?? false;
    }

    public function rules(): array
    {
        return [
            'delivery_notes' => ['required', 'array', 'min:1', 'max:10'],
            'delivery_notes.*' => ['required', 'file', 'mimes:pdf', 'extensions:pdf', 'max:10240'],
        ];
    }
}
