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
        Schema::create('equipment', function (Blueprint $table) {
            $table->id();
            $table->foreignId('equipment_category_id')->constrained()->restrictOnDelete();
            $table->foreignId('current_location_id')->nullable()->constrained('locations')->restrictOnDelete();
            $table->foreignId('custodian_employee_id')->nullable()->constrained('employees')->restrictOnDelete();
            $table->string('asset_code', 100)->unique();
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->string('serial_number')->nullable();
            $table->unsignedSmallInteger('purchase_year')->nullable();
            $table->string('condition', 30)->nullable();
            $table->string('operational_situation', 30)->nullable();
            $table->text('observations')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['equipment_category_id', 'serial_number']);
            $table->index(['condition', 'operational_situation']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('equipment');
    }
};
