<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('catalog_options', function (Blueprint $table) {
            $table->id();
            $table->string('group', 60);
            $table->string('code', 80);
            $table->string('label_fr');
            $table->string('label_ar')->nullable();
            $table->string('color', 20)->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['group', 'code']);
            $table->index(['group', 'is_active', 'sort_order']);
        });

        $now = now();
        $rows = [
            ['equipment_condition', 'very_good', 'Très bon', 'جيد جداً', '#237a4b'],
            ['equipment_condition', 'good', 'Bon', 'جيد', '#4b8f68'],
            ['equipment_condition', 'to_monitor', 'À surveiller', 'يحتاج إلى متابعة', '#a36213'],
            ['equipment_condition', 'defective', 'Défectueux', 'معطل', '#c27012'],
            ['equipment_condition', 'out_of_service', 'Hors service', 'خارج الخدمة', '#a12a36'],
            ['operational_situation', 'in_use', 'En service', 'قيد الاستخدام', '#237a4b'],
            ['operational_situation', 'in_reserve', 'En réserve', 'احتياطي', '#526070'],
            ['operational_situation', 'under_maintenance', 'En maintenance', 'قيد الصيانة', '#a36213'],
            ['operational_situation', 'out_of_service', 'Hors service', 'خارج الخدمة', '#a12a36'],
            ['maintenance_type', 'urgent', 'Urgente', 'عاجلة', '#a12a36'],
            ['maintenance_type', 'electrical', 'Électrique', 'كهربائية', '#3367b0'],
            ['maintenance_type', 'mechanical', 'Mécanique', 'ميكانيكية', '#526070'],
            ['maintenance_type', 'hydraulic', 'Hydraulique', 'هيدروليكية', '#237a7a'],
            ['fuel_type', 'GASOIL', 'GASOIL', 'ديزل', null],
            ['project_status', 'planned', 'Planifié', 'مخطط', '#526070'],
            ['project_status', 'active', 'Actif', 'نشط', '#237a4b'],
            ['project_status', 'on_hold', 'En pause', 'متوقف مؤقتاً', '#a36213'],
            ['project_status', 'completed', 'Terminé', 'مكتمل', '#3367b0'],
        ];
        foreach ($rows as $index => [$group, $code, $fr, $ar, $color]) {
            DB::table('catalog_options')->insert(['group' => $group, 'code' => $code, 'label_fr' => $fr, 'label_ar' => $ar, 'color' => $color, 'sort_order' => $index, 'is_active' => true, 'created_at' => $now, 'updated_at' => $now]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('catalog_options');
    }
};
