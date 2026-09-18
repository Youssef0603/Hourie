<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

#[Signature('users:create {--role=viewer : Internal role: manager, generator_manager, or viewer}')]
#[Description('Create an internal Hourie user account')]
class CreateUserCommand extends Command
{
    public function handle(): int
    {
        $data = [
            'name' => trim((string) $this->ask(__('users.command.name'))),
            'email' => Str::lower(trim((string) $this->ask(__('users.command.email')))),
            'password' => (string) $this->secret(__('users.command.password')),
            'password_confirmation' => (string) $this->secret(__('users.command.password_confirmation')),
            'role' => (string) $this->option('role'),
        ];

        $validator = Validator::make($data, [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:12', 'confirmed'],
            'role' => ['required', Rule::enum(UserRole::class)],
        ]);

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        DB::transaction(function () use ($data): void {
            $user = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'role' => $data['role'],
            ]);

            Employee::query()->create([
                'user_id' => $user->id,
                'name' => $user->name,
                'is_active' => true,
            ]);
        });

        $this->info(__('users.command.created'));

        return self::SUCCESS;
    }
}
