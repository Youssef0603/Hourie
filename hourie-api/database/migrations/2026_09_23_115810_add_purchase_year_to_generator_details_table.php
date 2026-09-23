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
        Schema::table('generator_details', function (Blueprint $table): void {
            $table->unsignedSmallInteger('purchase_year')->nullable()->after('purchase_price_fcfa');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('generator_details', function (Blueprint $table): void {
            $table->dropColumn('purchase_year');
        });
    }
};
