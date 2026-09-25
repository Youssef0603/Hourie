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
        $categoryId = DB::table('equipment_categories')->where('code', 'tower_crane')->value('id');

        if ($categoryId === null) {
            return;
        }

        DB::table('equipment')
            ->where('equipment_category_id', $categoryId)
            ->orderBy('id')
            ->each(function (object $equipment): void {
                DB::table('equipment')
                    ->where('id', $equipment->id)
                    ->update([
                        'asset_code' => 'A.H-GR-'.str_pad((string) $equipment->id, 3, '0', STR_PAD_LEFT),
                        'updated_at' => now(),
                    ]);
            });
    }

    /**
     * Asset identifiers are permanent references and must not be reverted automatically.
     */
    public function down(): void {}
};
