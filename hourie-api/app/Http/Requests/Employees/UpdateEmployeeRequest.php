<?php

namespace App\Http\Requests\Employees;

use App\Enums\UserRole;
use App\Models\Employee;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === UserRole::Manager;
    }

    /** @return array<string, ValidationRule|array<mixed>|string> */
    public function rules(): array
    {
        /** @var Employee|null $employee */
        $employee = $this->route('employee');
        $hasAccount = $employee?->user_id !== null;

        return [
            'name' => ['required', 'string', 'max:255'],
            'phone_number' => ['nullable', 'string', 'max:30'],
            'username' => [
                $hasAccount ? 'required' : 'nullable',
                'string',
                'min:3',
                'max:50',
                'regex:/^[a-z0-9._-]+$/',
                Rule::unique('users', 'username')->ignore($employee?->user_id),
            ],
            'email' => [
                'nullable',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($employee?->user_id),
            ],
            'role' => [$hasAccount ? 'required' : 'required_with:username', Rule::enum(UserRole::class)],
            'password' => [
                Rule::requiredIf(! $hasAccount && $this->filled('username')),
                'nullable',
                'string',
                Password::min(12),
                'confirmed',
            ],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('username')) {
            $this->merge([
                'username' => Str::lower($this->string('username')->trim()->toString()) ?: null,
            ]);
        }

        if ($this->has('email')) {
            $this->merge([
                'email' => Str::lower($this->string('email')->trim()->toString()) ?: null,
            ]);
        }
    }
}
