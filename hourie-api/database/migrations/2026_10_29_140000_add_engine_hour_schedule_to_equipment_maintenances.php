<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('equipment_maintenances', function (Blueprint $table): void {
            $table->decimal('maintenance_interval_hours', 12, 2)->nullable()->after('engine_hours');
            $table->decimal('next_maintenance_engine_hours', 12, 2)->nullable()->after('maintenance_interval_hours');
        });
    }

    public function down(): void
    {
        Schema::table('equipment_maintenances', function (Blueprint $table): void {
            $table->dropColumn(['maintenance_interval_hours', 'next_maintenance_engine_hours']);
        });
    }
};
