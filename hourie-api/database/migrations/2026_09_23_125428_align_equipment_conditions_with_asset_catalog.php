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

            DB::table('equipment')->where('condition', 'functional')->update(['condition' => 'good']);
            DB::table('equipment')->where('condition', 'beyond_repair')->update(['condition' => 'out_of_service']);

            DB::table('catalog_options')
                ->where('group', 'equipment_condition')
                ->where('code', 'functional')
                ->update(['code' => 'good', 'label_fr' => 'Bon', 'label_ar' => 'جيد', 'color' => '#4b8f68', 'sort_order' => 2, 'updated_at' => $now]);
            DB::table('catalog_options')
                ->where('group', 'equipment_condition')
                ->where('code', 'beyond_repair')
                ->update(['code' => 'out_of_service', 'label_fr' => 'Hors service', 'label_ar' => 'خارج الخدمة', 'color' => '#a12a36', 'sort_order' => 5, 'updated_at' => $now]);

            DB::table('catalog_options')->updateOrInsert(
                ['group' => 'equipment_condition', 'code' => 'very_good'],
                ['label_fr' => 'Très bon', 'label_ar' => 'جيد جداً', 'color' => '#237a4b', 'sort_order' => 1, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            );
            DB::table('catalog_options')->updateOrInsert(
                ['group' => 'equipment_condition', 'code' => 'to_monitor'],
                ['label_fr' => 'À surveiller', 'label_ar' => 'يحتاج إلى متابعة', 'color' => '#a36213', 'sort_order' => 3, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            );
            DB::table('catalog_options')
                ->where('group', 'equipment_condition')
                ->where('code', 'defective')
                ->update(['label_fr' => 'Défectueux', 'label_ar' => 'معطل', 'color' => '#c27012', 'sort_order' => 4, 'updated_at' => $now]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::transaction(function (): void {
            $now = now();

            DB::table('equipment')->where('condition', 'good')->update(['condition' => 'functional']);
            DB::table('equipment')->where('condition', 'out_of_service')->update(['condition' => 'beyond_repair']);

            DB::table('catalog_options')
                ->where('group', 'equipment_condition')
                ->where('code', 'good')
                ->update(['code' => 'functional', 'label_fr' => 'Fonctionnel', 'label_ar' => 'يعمل', 'color' => '#237a4b', 'sort_order' => 1, 'updated_at' => $now]);
            DB::table('catalog_options')
                ->where('group', 'equipment_condition')
                ->where('code', 'out_of_service')
                ->update(['code' => 'beyond_repair', 'label_fr' => 'Irréparable', 'label_ar' => 'غير قابل للإصلاح', 'color' => '#a12a36', 'sort_order' => 3, 'updated_at' => $now]);
            DB::table('catalog_options')->where('group', 'equipment_condition')->whereIn('code', ['very_good', 'to_monitor'])->delete();
        });
    }
};
