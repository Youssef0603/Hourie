<?php

namespace App\Http\Requests\Equipment;

use App\Models\Equipment;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ImportEquipmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Equipment::class) ?? false;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'mimes:xlsx', 'max:10240'],
        ];
    }
}
