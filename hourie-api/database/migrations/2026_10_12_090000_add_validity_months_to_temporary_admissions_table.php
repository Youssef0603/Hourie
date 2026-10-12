<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('temporary_admissions', function (Blueprint $table) {
            $table->unsignedSmallInteger('validity_months')->default(12)->after('entered_on');
        });
    }

    public function down(): void
    {
        Schema::table('temporary_admissions', function (Blueprint $table) {
            $table->dropColumn('validity_months');
        });
    }
};
