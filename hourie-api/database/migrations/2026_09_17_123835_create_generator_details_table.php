<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('generator_details', function (Blueprint $table) {
            $table->unsignedBigInteger('equipment_id')->primary();
            $table->foreign('equipment_id')->references('id')->on('equipment')->restrictOnDelete();
            $table->decimal('apparent_power_kva', 10, 2)->nullable();
            $table->decimal('active_power_kw', 10, 2)->nullable();
            $table->string('phases', 50)->nullable();
            $table->string('voltage_rating', 100)->nullable();
            $table->decimal('frequency_hz', 8, 2)->nullable();
            $table->string('current_rating', 100)->nullable();
            $table->string('fuel_type', 100)->nullable();
            $table->decimal('tank_capacity_litres', 10, 2)->nullable();
            $table->decimal('current_engine_hours', 12, 2)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('generator_details');
    }
};
