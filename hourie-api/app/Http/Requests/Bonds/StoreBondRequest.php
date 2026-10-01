<?php

namespace App\Http\Requests\Bonds;

use App\Models\Bond;
use App\Models\Location;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreBondRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role->canManageSites() ?? false;
    }

    public function rules(): array
    {
        return [
            'project_id' => ['required', 'integer', 'exists:projects,id'],
            'location_id' => ['required', 'integer', Rule::exists('locations', 'id')->where(fn ($query) => $query->where('is_active', true)->whereNotNull('parent_id'))],
            'bond_type' => ['required', 'string', Rule::in(Bond::TYPES)],
            'issuer' => ['nullable', 'string', 'max:255'],
            'amount' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string', Rule::in(['XOF', 'EUR', 'USD'])],
            'issued_on' => ['nullable', 'date'],
            'expires_on' => ['nullable', 'date', 'after_or_equal:issued_on'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /** @return array<int, callable(Validator): void> */
    public function after(): array
    {
        return [function (Validator $validator): void {
            if ($validator->errors()->hasAny(['project_id', 'location_id'])) {
                return;
            }

            $locationProjectId = Location::query()->whereKey($this->integer('location_id'))->value('project_id');
            if ((int) $locationProjectId !== $this->integer('project_id')) {
                $validator->errors()->add('location_id', 'La localisation physique doit appartenir au site sélectionné.');
            }
        }];
    }
}
