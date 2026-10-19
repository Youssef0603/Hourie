<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('employees')
            ->whereNotNull('phone_number')
            ->orderBy('id')
            ->each(function (object $employee): void {
                $digits = preg_replace('/\D+/', '', (string) $employee->phone_number) ?? '';

                DB::table('employees')
                    ->where('id', $employee->id)
                    ->update(['phone_number' => $digits === '' ? null : '+'.$digits]);
            });
    }

    public function down(): void
    {
        // Canonical international values are intentionally retained.
    }
};
