<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('generator_details', 'sold_to')) {
            return;
        }

        Schema::table('generator_details', function (Blueprint $table) {
            $table->string('sold_to')->nullable()->after('purchase_price_fcfa');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('generator_details', 'sold_to')) {
            return;
        }

        Schema::table('generator_details', function (Blueprint $table) {
            $table->dropColumn('sold_to');
        });
    }
};
