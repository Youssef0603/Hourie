<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('insurance_policies', function (Blueprint $table): void {
            $table->id();
            $table->string('insurance_type', 40);
            $table->string('policy_number');
            $table->date('starts_on')->nullable();
            $table->date('ends_on')->nullable();
            $table->decimal('net_premium', 15, 2)->nullable();
            $table->decimal('accessories_amount', 15, 2)->nullable();
            $table->decimal('tax_amount', 15, 2)->nullable();
            $table->decimal('policy_cost', 15, 2)->nullable();
            $table->decimal('total_amount', 15, 2)->nullable();
            $table->decimal('coverage_amount', 15, 2)->nullable();
            $table->string('invoice_number')->nullable();
            $table->string('territory')->nullable();
            $table->string('insured_situation')->nullable();
            $table->string('source')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['insurance_type', 'ends_on']);
        });

        Schema::create('insurance_policy_employees', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('insurance_policy_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->unique(['insurance_policy_id', 'employee_id'], 'insurance_employee_unique');
        });

        Schema::create('insurance_policy_equipment', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('insurance_policy_id')->constrained()->cascadeOnDelete();
            $table->foreignId('equipment_id')->constrained()->cascadeOnDelete();
            $table->unique(['insurance_policy_id', 'equipment_id'], 'insurance_equipment_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('insurance_policy_equipment');
        Schema::dropIfExists('insurance_policy_employees');
        Schema::dropIfExists('insurance_policies');
    }
};
