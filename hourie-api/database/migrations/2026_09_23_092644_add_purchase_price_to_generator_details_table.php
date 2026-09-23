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
        Schema::table('generator_details', function (Blueprint $table) {
            $table->decimal('purchase_price_fcfa', 15, 2)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('generator_details', function (Blueprint $table) {
            $table->dropColumn('purchase_price_fcfa');
        });
    }
};
