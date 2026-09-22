<?php

namespace App\Http\Requests\Equipment;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreEquipmentInvoicesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('update', $this->route('equipment')) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'invoices' => ['required', 'array', 'min:1', 'max:10'],
            'invoices.*' => ['required', 'file', 'mimes:pdf', 'extensions:pdf', 'max:10240'],
        ];
    }
}
