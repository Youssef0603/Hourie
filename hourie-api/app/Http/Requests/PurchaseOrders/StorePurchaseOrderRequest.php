<?php

namespace App\Http\Requests\PurchaseOrders;

use App\Rules\ProjectHasCostCode;
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
     * @return array<string, array<int, mixed>>
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
            'project_id' => ['required', 'integer', 'exists:projects,id', new ProjectHasCostCode],
            'reason' => ['nullable', 'string', 'max:255'],
            'prepared_by' => ['nullable', 'string', 'max:255'],
            'ordered_by' => ['nullable', 'string', 'max:255'],
            'approved_by' => ['nullable', 'string', 'max:255'],
            'vat_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'currency' => ['required', 'string', 'size:3'],
            'notes' => ['nullable', 'string', 'max:5000'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.budget_code' => ['nullable', 'string', 'max:100'],
            'items.*.subcontract_item_material_id' => ['nullable', 'integer', 'exists:subcontract_item_materials,id'],
            'items.*.description' => ['required', 'string', 'max:2000'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:4294967295'],
            'items.*.unit' => ['nullable', 'string', 'max:20'],
            'items.*.unit_price' => ['required', 'numeric', 'min:0', 'max:9999999999999'],
        ];
    }
}
