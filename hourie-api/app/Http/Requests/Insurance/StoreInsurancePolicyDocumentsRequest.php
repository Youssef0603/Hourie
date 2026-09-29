<?php

namespace App\Http\Requests\Insurance;

use Illuminate\Foundation\Http\FormRequest;

class StoreInsurancePolicyDocumentsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role->canManageSites() ?? false;
    }

    public function rules(): array
    {
        return [
            'documents' => ['required', 'array', 'min:1', 'max:10'],
            'documents.*' => ['required', 'file', 'mimes:pdf', 'extensions:pdf', 'max:10240'],
        ];
    }
}
