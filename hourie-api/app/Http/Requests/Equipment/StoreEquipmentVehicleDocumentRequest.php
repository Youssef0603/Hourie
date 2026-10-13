<?php

namespace App\Http\Requests\Equipment;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreEquipmentVehicleDocumentRequest extends FormRequest
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
            'document' => ['required', 'file', 'mimes:pdf', 'extensions:pdf', 'max:10240'],
        ];
    }

    /** @return array<int, callable(Validator): void> */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $equipment = $this->route('equipment');

                if ($equipment !== null && $equipment->category()->where('code', 'car')->doesntExist()) {
                    $validator->errors()->add('document', 'Les documents du véhicule sont disponibles uniquement pour les voitures.');
                }
            },
        ];
    }
}
