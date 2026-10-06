<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('temporary_admissions', function (Blueprint $table) {
            $table->decimal('customs_duty_amount', 15, 2)->nullable()->after('clearance_reference');
        });
    }

    public function down(): void
    {
        Schema::table('temporary_admissions', function (Blueprint $table) {
            $table->dropColumn('customs_duty_amount');
        });
    }
};
