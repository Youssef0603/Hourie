<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Unit of the ordered quantity (t, sac, m³…). Lines bought for a
     * subcontract material always use that material's unit.
     */
    public function up(): void
    {
        Schema::table('purchase_order_items', function (Blueprint $table): void {
            $table->string('unit', 20)->nullable()->after('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_order_items', function (Blueprint $table): void {
            $table->dropColumn('unit');
        });
    }
};
