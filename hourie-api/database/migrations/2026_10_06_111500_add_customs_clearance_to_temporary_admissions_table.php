<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('temporary_admissions', function (Blueprint $table) {
            $table->date('cleared_on')->nullable()->after('returned_on');
            $table->string('clearance_reference')->nullable()->after('cleared_on');
        });
    }

    public function down(): void
    {
        Schema::table('temporary_admissions', function (Blueprint $table) {
            $table->dropColumn(['cleared_on', 'clearance_reference']);
        });
    }
};
