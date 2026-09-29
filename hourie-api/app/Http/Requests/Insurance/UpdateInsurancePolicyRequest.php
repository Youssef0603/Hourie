<?php

namespace App\Http\Requests\Insurance;

class UpdateInsurancePolicyRequest extends StoreInsurancePolicyRequest
{
    public function rules(): array
    {
        return array_map(fn (array $rules) => $rules[0] === 'required' ? ['sometimes', ...array_slice($rules, 1)] : $rules, parent::rules());
    }
}
