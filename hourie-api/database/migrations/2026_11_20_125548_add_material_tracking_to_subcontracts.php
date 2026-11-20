<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Material tracking: a work item says who supplies its materials. When ARH
 * supplies them, each material has a consumption per unit of work, and the
 * purchase order lines that bought it point to that material, so purchases
 * can be compared with the work actually executed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subcontract_items', function (Blueprint $table): void {
            $table->string('materials_supplied_by', 20)->default('subcontractor')->after('unit_price');
        });

        Schema::create('subcontract_item_materials', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('subcontract_item_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('unit', 20);
            $table->decimal('quantity_per_unit', 15, 4);
            $table->decimal('waste_percent', 5, 2)->default(0);
            $table->timestamps();
        });

        Schema::table('purchase_order_items', function (Blueprint $table): void {
            $table->foreignId('subcontract_item_material_id')->nullable()->after('budget_code')
                ->constrained('subcontract_item_materials')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('purchase_order_items', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('subcontract_item_material_id');
        });
        Schema::dropIfExists('subcontract_item_materials');
        Schema::table('subcontract_items', function (Blueprint $table): void {
            $table->dropColumn('materials_supplied_by');
        });
    }
};
