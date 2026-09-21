<?php

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'login' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string'],
            'remember' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * Attempt to authenticate the request credentials.
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $login = $this->string('login')->toString();
        $loginField = str_contains($login, '@') ? 'email' : 'username';
        $authenticated = Auth::guard('web')->attempt(
            [$loginField => $login, 'is_active' => true, 'password' => $this->string('password')->toString()],
            $this->boolean('remember'),
        );

        if (! $authenticated) {
            throw ValidationException::withMessages([
                'login' => [__('auth.failed')],
            ]);
        }
    }

    protected function prepareForValidation(): void
    {
        $login = $this->string('login')->trim()->toString();

        $this->merge([
            'login' => Str::lower($login !== '' ? $login : $this->string('email')->trim()->toString()),
        ]);
    }
}
