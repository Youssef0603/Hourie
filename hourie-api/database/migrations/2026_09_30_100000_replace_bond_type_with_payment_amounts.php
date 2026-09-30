<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bonds', function (Blueprint $table): void {
            $table->decimal('advance_payment_amount', 15, 2)->default(0)->after('beneficiary');
            $table->decimal('performance_amount', 15, 2)->default(0)->after('advance_payment_amount');
            $table->decimal('retention_amount', 15, 2)->default(0)->after('performance_amount');
        });

        DB::table('bonds')->where('bond_type', 'advance_payment')->update(['advance_payment_amount' => DB::raw('amount')]);
        DB::table('bonds')->where('bond_type', 'performance')->update(['performance_amount' => DB::raw('amount')]);
        DB::table('bonds')->where('bond_type', 'retention')->update(['retention_amount' => DB::raw('amount')]);

        Schema::table('bonds', function (Blueprint $table): void {
            $table->dropIndex(['bond_type', 'expires_on']);
            $table->dropColumn('bond_type');
            $table->index('expires_on');
        });
    }

    public function down(): void
    {
        Schema::table('bonds', function (Blueprint $table): void {
            $table->string('bond_type', 40)->default('performance')->after('project_id');
            $table->dropIndex(['expires_on']);
            $table->index(['bond_type', 'expires_on']);
        });

        Schema::table('bonds', function (Blueprint $table): void {
            $table->dropColumn(['advance_payment_amount', 'performance_amount', 'retention_amount']);
        });
    }
};
