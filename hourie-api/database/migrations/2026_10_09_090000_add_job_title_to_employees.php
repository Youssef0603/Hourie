<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        $positions = [
            ['not_specified', 'À définir', 'غير محدد'],
            ['project_manager', 'Chef de projet', 'مدير مشروع'],
            ['site_engineer', 'Ingénieur de chantier', 'مهندس موقع'],
            ['civil_engineer', 'Ingénieur civil', 'مهندس مدني'],
            ['architect', 'Architecte', 'مهندس معماري'],
            ['quantity_surveyor', 'Métreur', 'مساح كميات'],
            ['accountant', 'Comptable', 'محاسب'],
            ['software_engineer', 'Ingénieur logiciel', 'مهندس برمجيات'],
            ['health_safety_officer', 'Responsable HSE', 'مسؤول الصحة والسلامة'],
            ['equipment_manager', 'Responsable matériel', 'مسؤول المعدات'],
            ['driver_operator', 'Chauffeur / conducteur d’engin', 'سائق / مشغل آليات'],
            ['administrative_assistant', 'Assistant administratif', 'مساعد إداري'],
            ['other', 'Autre', 'أخرى'],
        ];

        foreach ($positions as $index => [$code, $labelFr, $labelAr]) {
            DB::table('catalog_options')->updateOrInsert(
                ['group' => 'employee_job_title', 'code' => $code],
                [
                    'label_fr' => $labelFr,
                    'label_ar' => $labelAr,
                    'color' => null,
                    'sort_order' => $index,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }

        Schema::table('employees', function (Blueprint $table): void {
            $table->string('job_title', 80)->default('not_specified')->after('name')->index();
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table): void {
            $table->dropIndex(['job_title']);
            $table->dropColumn('job_title');
        });

        DB::table('catalog_options')->where('group', 'employee_job_title')->delete();
    }
};
