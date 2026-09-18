<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('equipment_maintenances', function (Blueprint $table) {
            $table->decimal('oil_quantity_litres', 10, 2)->nullable()->after('oil_changed');
        });
    }

    public function down(): void
    {
        Schema::table('equipment_maintenances', function (Blueprint $table) {
            $table->dropColumn('oil_quantity_litres');
        });
    }
};
