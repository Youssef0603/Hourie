<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Fields of the PM's subcontractor valuation that Hourie did not keep yet:
     * - subcontracts.employer_name / engineer_name: the client (maître
     *   d'ouvrage) and the supervising engineer named in the header;
     * - subcontract_valuations.materials_on_site / claims: lines 03 and 05,
     *   cumulative amounts counted in the gross works of the valuation.
     */
    public function up(): void
    {
        Schema::table('subcontracts', function (Blueprint $table): void {
            $table->string('employer_name')->nullable()->after('title');
            $table->string('engineer_name')->nullable()->after('employer_name');
        });

        Schema::table('subcontract_valuations', function (Blueprint $table): void {
            $table->decimal('materials_on_site', 15, 2)->default(0)->after('period_end');
            $table->decimal('claims', 15, 2)->default(0)->after('materials_on_site');
        });
    }

    public function down(): void
    {
        Schema::table('subcontract_valuations', function (Blueprint $table): void {
            $table->dropColumn(['materials_on_site', 'claims']);
        });

        Schema::table('subcontracts', function (Blueprint $table): void {
            $table->dropColumn(['employer_name', 'engineer_name']);
        });
    }
};
