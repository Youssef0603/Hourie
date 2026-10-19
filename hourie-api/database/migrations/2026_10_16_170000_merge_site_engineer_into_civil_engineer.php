<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('employees')
            ->where('job_title', 'site_engineer')
            ->update(['job_title' => 'civil_engineer']);

        DB::table('catalog_options')
            ->where('group', 'employee_job_title')
            ->where('code', 'site_engineer')
            ->delete();
    }

    public function down(): void
    {
        $now = now();

        DB::table('catalog_options')->updateOrInsert(
            ['group' => 'employee_job_title', 'code' => 'site_engineer'],
            [
                'label_fr' => 'Ingénieur de chantier',
                'label_ar' => 'مهندس موقع',
                'color' => null,
                'sort_order' => 2,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        );
    }
};
