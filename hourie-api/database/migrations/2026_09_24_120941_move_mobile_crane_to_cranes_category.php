<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::transaction(function (): void {
            $now = now();
            $categoryId = DB::table('equipment_categories')->where('code', 'tower_crane')->value('id');

            if ($categoryId === null) {
                $categoryId = DB::table('equipment_categories')->insertGetId([
                    'code' => 'tower_crane',
                    'name' => 'Grues',
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            } else {
                DB::table('equipment_categories')->where('id', $categoryId)->update(['name' => 'Grues', 'updated_at' => $now]);
            }

            $equipment = DB::table('equipment')->where('serial_number', 'W09262000VEL05188')->first();

            if ($equipment === null) {
                return;
            }

            $details = json_decode((string) $equipment->asset_details, true) ?: [];
            DB::table('equipment')->where('id', $equipment->id)->update([
                'equipment_category_id' => $categoryId,
                'asset_code' => 'A.H-GRT-'.str_pad((string) $equipment->id, 3, '0', STR_PAD_LEFT),
                'asset_details' => json_encode([
                    'crane_type' => $details['equipment_type'] ?? null,
                    'sub_category' => $details['sub_category'] ?? null,
                    'counter_at_purchase' => $details['counter_at_purchase'] ?? null,
                    'purchase_price' => $details['purchase_price'] ?? null,
                    'shipping_cost' => $details['shipping_cost'] ?? null,
                    'official_document_type' => $details['official_document_type'] ?? null,
                    'official_document_location' => $details['official_document_location'] ?? null,
                ]),
                'updated_at' => $now,
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::transaction(function (): void {
            $equipmentCategoryId = DB::table('equipment_categories')->where('code', 'equipment')->value('id');
            $equipment = DB::table('equipment')->where('serial_number', 'W09262000VEL05188')->first();

            if ($equipmentCategoryId === null || $equipment === null) {
                return;
            }

            $details = json_decode((string) $equipment->asset_details, true) ?: [];
            DB::table('equipment')->where('id', $equipment->id)->update([
                'equipment_category_id' => $equipmentCategoryId,
                'asset_code' => 'A.H-MAT-'.str_pad((string) $equipment->id, 3, '0', STR_PAD_LEFT),
                'asset_details' => json_encode([
                    'equipment_type' => $details['crane_type'] ?? null,
                    'sub_category' => $details['sub_category'] ?? null,
                    'capacity' => null,
                    'power_source' => null,
                    'counter_at_purchase' => $details['counter_at_purchase'] ?? null,
                    'purchase_price' => $details['purchase_price'] ?? null,
                    'shipping_cost' => $details['shipping_cost'] ?? null,
                    'official_document_type' => $details['official_document_type'] ?? null,
                    'official_document_location' => $details['official_document_location'] ?? null,
                ]),
                'updated_at' => now(),
            ]);
        });
    }
};
