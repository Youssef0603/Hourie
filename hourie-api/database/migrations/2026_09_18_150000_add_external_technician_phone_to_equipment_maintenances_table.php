<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('equipment_maintenances', function (Blueprint $table): void {
            $table->string('external_technician_phone', 50)->nullable()->after('technician_name');
        });
    }

    public function down(): void
    {
        Schema::table('equipment_maintenances', function (Blueprint $table): void {
            $table->dropColumn('external_technician_phone');
        });
    }
};
