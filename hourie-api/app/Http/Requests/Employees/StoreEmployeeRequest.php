<?php

namespace App\Http\Requests\Employees;

use App\Enums\UserRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        $role = $this->user()?->role;

        if ($role === null || ! $role->canManageUsers()) {
            return false;
        }

        return ! $this->boolean('create_account')
            || $role->canManageManagerAccounts()
            || $this->input('role') !== UserRole::Manager->value;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'phone_number' => ['nullable', 'string', 'max:30'],
            'passport_number' => ['nullable', 'string', 'max:100', 'unique:employees,passport_number'],
            'employment_date' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'create_account' => ['required', 'boolean'],
            'email' => ['nullable', 'string', 'email', 'max:255', 'unique:users,email'],
            'role' => [Rule::requiredIf($this->boolean('create_account')), 'nullable', Rule::enum(UserRole::class)],
            'password' => [Rule::requiredIf($this->boolean('create_account')), 'nullable', 'string', Password::min(12), 'confirmed'],
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'create_account' => $this->has('create_account') ? $this->boolean('create_account') : true,
            'email' => Str::lower($this->string('email')->trim()->toString()) ?: null,
            'passport_number' => Str::upper($this->string('passport_number')->trim()->toString()) ?: null,
        ]);
    }
}
