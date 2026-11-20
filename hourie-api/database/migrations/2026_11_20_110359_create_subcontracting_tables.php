<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Subcontracting: a subcontract lists priced work items, variations add
 * authorised quantity, and monthly valuations record cumulative executed
 * quantities from which the amount payable is calculated.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('subcontractors', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('contact_name')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('tax_number')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('subcontracts', function (Blueprint $table): void {
            $table->id();
            $table->string('reference', 40)->unique();
            $table->foreignId('subcontractor_id')->constrained()->restrictOnDelete();
            $table->foreignId('project_id')->constrained()->restrictOnDelete();
            $table->foreignId('created_by_user_id')->constrained('users');
            $table->string('title');
            $table->date('signed_on')->nullable();
            $table->decimal('vat_rate', 5, 2)->default(0);
            $table->decimal('retention_rate', 5, 2)->default(10);
            $table->decimal('advance_amount', 15, 2)->default(0);
            $table->decimal('advance_recovery_rate', 5, 2)->default(0);
            $table->char('currency', 3)->default('XOF');
            $table->string('status', 20)->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('subcontract_variations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('subcontract_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('sequence');
            $table->string('title');
            $table->text('reason')->nullable();
            $table->date('approved_on');
            $table->foreignId('created_by_user_id')->constrained('users');
            $table->timestamps();
            $table->unique(['subcontract_id', 'sequence']);
        });

        Schema::create('subcontract_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('subcontract_id')->constrained()->cascadeOnDelete();
            $table->foreignId('variation_id')->nullable()->constrained('subcontract_variations')->cascadeOnDelete();
            $table->unsignedSmallInteger('position');
            $table->string('code', 50)->nullable();
            $table->string('description', 2000);
            $table->string('unit', 20);
            $table->decimal('quantity', 15, 3);
            $table->decimal('unit_price', 15, 2);
            $table->timestamps();
        });

        Schema::create('subcontract_variation_lines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('variation_id')->constrained('subcontract_variations')->cascadeOnDelete();
            $table->foreignId('subcontract_item_id')->constrained()->cascadeOnDelete();
            $table->decimal('quantity', 15, 3);
            $table->timestamps();
        });

        Schema::create('subcontract_valuations', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('subcontract_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('sequence');
            $table->string('reference', 60)->unique();
            $table->date('valuation_date');
            $table->date('period_end');
            $table->string('status', 20)->default('draft');
            $table->decimal('materials_deduction', 15, 2)->default(0);
            $table->decimal('backcharges', 15, 2)->default(0);
            $table->text('comment')->nullable();
            $table->decimal('works_cumulative', 15, 2)->default(0);
            $table->decimal('works_previous', 15, 2)->default(0);
            $table->decimal('advance_recovery_cumulative', 15, 2)->default(0);
            $table->decimal('advance_recovery_previous', 15, 2)->default(0);
            $table->decimal('retention_cumulative', 15, 2)->default(0);
            $table->decimal('retention_previous', 15, 2)->default(0);
            $table->decimal('previously_certified', 15, 2)->default(0);
            $table->decimal('vat_amount', 15, 2)->default(0);
            $table->decimal('net_due', 15, 2)->default(0);
            $table->string('invoice_number')->nullable();
            $table->date('invoice_date')->nullable();
            $table->decimal('invoice_amount', 15, 2)->nullable();
            $table->foreignId('created_by_user_id')->constrained('users');
            $table->foreignId('approved_by_user_id')->nullable()->constrained('users');
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();
            $table->unique(['subcontract_id', 'sequence']);
        });

        Schema::create('subcontract_valuation_lines', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('valuation_id')->constrained('subcontract_valuations')->cascadeOnDelete();
            $table->foreignId('subcontract_item_id')->constrained()->cascadeOnDelete();
            $table->decimal('cumulative_quantity', 15, 3);
            $table->timestamps();
            $table->unique(['valuation_id', 'subcontract_item_id'], 'valuation_lines_item_unique');
        });

        Schema::create('subcontract_valuation_documents', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('valuation_id')->constrained('subcontract_valuations')->cascadeOnDelete();
            $table->string('type', 20);
            $table->foreignId('uploaded_by_user_id')->constrained('users');
            $table->string('disk');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type');
            $table->unsignedBigInteger('size_bytes');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subcontract_valuation_documents');
        Schema::dropIfExists('subcontract_valuation_lines');
        Schema::dropIfExists('subcontract_valuations');
        Schema::dropIfExists('subcontract_variation_lines');
        Schema::dropIfExists('subcontract_items');
        Schema::dropIfExists('subcontract_variations');
        Schema::dropIfExists('subcontracts');
        Schema::dropIfExists('subcontractors');
    }
};
