<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Payments actually made against a valuation, so a valuation can be paid
     * in several transfers. Valuations already marked paid get one payment
     * for their full net due, dated the day they were marked paid.
     */
    public function up(): void
    {
        Schema::create('subcontract_valuation_payments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('valuation_id')->constrained('subcontract_valuations')->cascadeOnDelete();
            $table->decimal('amount', 15, 2);
            $table->date('paid_on');
            $table->string('method', 20)->nullable();
            $table->string('reference')->nullable();
            $table->string('notes', 500)->nullable();
            $table->foreignId('recorded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        DB::table('subcontract_valuations')
            ->where('status', 'paid')
            ->orderBy('id')
            ->each(function (object $valuation): void {
                DB::table('subcontract_valuation_payments')->insert([
                    'valuation_id' => $valuation->id,
                    'amount' => $valuation->net_due,
                    'paid_on' => substr((string) ($valuation->paid_at ?? $valuation->updated_at), 0, 10),
                    'recorded_by_user_id' => $valuation->approved_by_user_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });
    }

    public function down(): void
    {
        DB::table('subcontract_valuations')->where('status', 'partially_paid')->update(['status' => 'approved']);
        Schema::dropIfExists('subcontract_valuation_payments');
    }
};
