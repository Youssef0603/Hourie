<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Adds the "Directeur général" job title, listed first after "À définir".
     */
    public function up(): void
    {
        $exists = DB::table('catalog_options')
            ->where('group', 'employee_job_title')
            ->where('code', 'general_manager')
            ->exists();

        if (! $exists) {
            DB::table('catalog_options')->insert([
                'group' => 'employee_job_title',
                'code' => 'general_manager',
                'label_fr' => 'Directeur général',
                'label_ar' => 'المدير العام',
                'sort_order' => 1,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        DB::table('catalog_options')
            ->where('group', 'employee_job_title')
            ->where('code', 'general_manager')
            ->delete();
    }
};
