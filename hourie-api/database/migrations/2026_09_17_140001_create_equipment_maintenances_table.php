<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('equipment_maintenances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_id')->constrained('equipment')->restrictOnDelete();
            $table->foreignId('technician_employee_id')->nullable()->constrained('employees')->restrictOnDelete();
            $table->foreignId('created_by_user_id')->constrained('users')->restrictOnDelete();
            $table->date('maintenance_date');
            $table->decimal('engine_hours', 12, 2)->nullable();
            $table->string('intervention_type');
            $table->boolean('oil_changed')->nullable();
            $table->boolean('oil_filter_changed')->nullable();
            $table->boolean('fuel_filter_changed')->nullable();
            $table->boolean('air_filter_changed')->nullable();
            $table->string('battery_service')->nullable();
            $table->string('coolant_service')->nullable();
            $table->string('technician_name')->nullable();
            $table->string('next_maintenance_due')->nullable();
            $table->decimal('cost', 14, 2)->nullable();
            $table->char('cost_currency', 3)->nullable();
            $table->text('observations')->nullable();
            $table->timestamps();

            $table->index(['equipment_id', 'maintenance_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('equipment_maintenances');
    }
};
