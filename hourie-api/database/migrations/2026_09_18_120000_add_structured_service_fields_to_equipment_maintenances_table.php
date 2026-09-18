<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('equipment_maintenances', function (Blueprint $table) {
            $table->boolean('battery_serviced')->nullable()->after('air_filter_changed');
            $table->boolean('coolant_serviced')->nullable()->after('battery_serviced');
            $table->date('next_maintenance_date')->nullable()->after('technician_name');
        });

        DB::table('equipment_maintenances')
            ->whereNotNull('battery_service')
            ->update(['battery_serviced' => true]);

        DB::table('equipment_maintenances')
            ->whereNotNull('coolant_service')
            ->update(['coolant_serviced' => true]);
    }

    public function down(): void
    {
        Schema::table('equipment_maintenances', function (Blueprint $table) {
            $table->dropColumn(['battery_serviced', 'coolant_serviced', 'next_maintenance_date']);
        });
    }
};
