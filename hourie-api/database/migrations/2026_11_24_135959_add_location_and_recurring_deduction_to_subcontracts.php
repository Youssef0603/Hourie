<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * - subcontract_valuation_lines.location: where the work of the period was
     *   done (the "profil" of road works, e.g. P40 - P59).
     * - subcontracts.recurring_deduction_*: a fixed amount taken off every
     *   situation (e.g. "Coupe pavé", 25 000), filled in automatically.
     */
    public function up(): void
    {
        Schema::table('subcontract_valuation_lines', function (Blueprint $table): void {
            $table->string('location')->nullable()->after('cumulative_quantity');
        });

        Schema::table('subcontracts', function (Blueprint $table): void {
            $table->string('recurring_deduction_label')->nullable()->after('cash_percent');
            $table->decimal('recurring_deduction_amount', 15, 2)->default(0)->after('recurring_deduction_label');
        });
    }

    public function down(): void
    {
        Schema::table('subcontracts', function (Blueprint $table): void {
            $table->dropColumn(['recurring_deduction_label', 'recurring_deduction_amount']);
        });

        Schema::table('subcontract_valuation_lines', function (Blueprint $table): void {
            $table->dropColumn('location');
        });
    }
};
