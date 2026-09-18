<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('status', 30)->default('active')->after('name');
            $table->string('address')->nullable()->after('status');
            $table->date('start_date')->nullable()->after('address');
            $table->date('expected_end_date')->nullable()->after('start_date');
            $table->text('notes')->nullable()->after('expected_end_date');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['status', 'address', 'start_date', 'expected_end_date', 'notes']);
        });
    }
};
