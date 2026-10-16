<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('equipment')
            ->where('operational_situation', 'out_of_service')
            ->where(function ($query): void {
                $query->whereNull('condition')->orWhere('condition', '');
            })
            ->update(['condition' => 'out_of_service']);

        DB::table('equipment_changes')
            ->where('change_type', 'operational_situation_changed')
            ->delete();
        DB::table('catalog_options')
            ->where('group', 'operational_situation')
            ->delete();

        Schema::table('equipment', function (Blueprint $table): void {
            $table->dropIndex(['condition', 'operational_situation']);
            $table->dropColumn('operational_situation');
            $table->index('condition');
        });
    }

    public function down(): void
    {
        Schema::table('equipment', function (Blueprint $table): void {
            $table->dropIndex(['condition']);
            $table->string('operational_situation', 30)->nullable()->after('condition');
            $table->index(['condition', 'operational_situation']);
        });

        $now = now();
        DB::table('catalog_options')->insert([
            ['group' => 'operational_situation', 'code' => 'in_use', 'label_fr' => 'En service', 'label_ar' => 'قيد الاستخدام', 'color' => '#237a4b', 'sort_order' => 5, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['group' => 'operational_situation', 'code' => 'in_reserve', 'label_fr' => 'En réserve', 'label_ar' => 'احتياطي', 'color' => '#526070', 'sort_order' => 6, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['group' => 'operational_situation', 'code' => 'under_maintenance', 'label_fr' => 'En maintenance', 'label_ar' => 'قيد الصيانة', 'color' => '#a36213', 'sort_order' => 7, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['group' => 'operational_situation', 'code' => 'out_of_service', 'label_fr' => 'Hors service', 'label_ar' => 'خارج الخدمة', 'color' => '#a12a36', 'sort_order' => 8, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);
    }
};
