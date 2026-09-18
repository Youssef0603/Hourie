<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        DB::table('users')
            ->whereNotExists(function ($query): void {
                $query->selectRaw('1')
                    ->from('employees')
                    ->whereColumn('employees.user_id', 'users.id');
            })
            ->orderBy('id')
            ->get(['id', 'name'])
            ->each(function (object $user) use ($now): void {
                DB::table('employees')->insert([
                    'user_id' => $user->id,
                    'employee_code' => null,
                    'name' => $user->name,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            });
    }

    public function down(): void
    {
        // Existing employee profiles are business data and must not be deleted on rollback.
    }
};
