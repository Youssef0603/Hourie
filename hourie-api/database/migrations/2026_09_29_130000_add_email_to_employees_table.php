<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table): void { $table->string('email')->nullable()->after('phone_number'); });

        // Keep this data migration portable across MySQL and the SQLite test database.
        foreach (DB::table('users')->whereNotNull('email')->pluck('email', 'id') as $userId => $email) {
            DB::table('employees')->where('user_id', $userId)->update(['email' => $email]);
        }
    }
    public function down(): void { Schema::table('employees', function (Blueprint $table): void { $table->dropColumn('email'); }); }
};
