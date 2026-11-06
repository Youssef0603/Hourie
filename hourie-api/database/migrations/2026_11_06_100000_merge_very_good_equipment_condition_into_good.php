<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function (): void {
            DB::table('equipment')
                ->where('condition', 'very_good')
                ->update(['condition' => 'good', 'updated_at' => now()]);

            DB::table('catalog_options')
                ->where('group', 'equipment_condition')
                ->where('code', 'very_good')
                ->delete();

            DB::table('catalog_options')
                ->where('group', 'equipment_condition')
                ->where('code', 'good')
                ->update([
                    'label_fr' => 'Bon',
                    'label_ar' => 'جيد',
                    'color' => '#4b8f68',
                    'is_active' => true,
                    'updated_at' => now(),
                ]);
        });
    }

    public function down(): void
    {
        $now = now();

        DB::table('catalog_options')->updateOrInsert(
            ['group' => 'equipment_condition', 'code' => 'very_good'],
            [
                'label_fr' => 'Très bon',
                'label_ar' => 'جيد جداً',
                'color' => '#237a4b',
                'sort_order' => 1,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        );
    }
};
