<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        $positions = [
            ['architect', 'Architecte', 'مهندس معماري', 4],
            ['admin', 'Admin', 'إداري', 12],
            ['garage', 'Garage', 'المرآب', 13],
            ['topographer', 'Topographe', 'مسّاح طبوغرافي', 14],
            ['asphalt_plant', 'Centrale à bitume', 'محطة الأسفلت', 15],
        ];

        foreach ($positions as [$code, $labelFr, $labelAr, $sortOrder]) {
            DB::table('catalog_options')->updateOrInsert(
                ['group' => 'employee_job_title', 'code' => $code],
                [
                    'label_fr' => $labelFr,
                    'label_ar' => $labelAr,
                    'color' => null,
                    'sort_order' => $sortOrder,
                    'is_active' => true,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }

        DB::table('catalog_options')
            ->where('group', 'employee_job_title')
            ->where('code', 'other')
            ->update(['sort_order' => 99, 'updated_at' => $now]);
    }

    public function down(): void
    {
        DB::table('catalog_options')
            ->where('group', 'employee_job_title')
            ->whereIn('code', ['admin', 'garage', 'topographer', 'asphalt_plant'])
            ->delete();

        DB::table('catalog_options')
            ->where('group', 'employee_job_title')
            ->where('code', 'other')
            ->update(['sort_order' => 12, 'updated_at' => now()]);
    }
};
