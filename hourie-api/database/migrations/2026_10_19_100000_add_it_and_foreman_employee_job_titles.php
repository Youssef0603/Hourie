<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();
        $positions = [
            ['it', 'IT', 'تقنية المعلومات', 7],
            ['foreman', 'Foreman', 'رئيس عمال', 8],
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
    }

    public function down(): void
    {
        DB::table('catalog_options')
            ->where('group', 'employee_job_title')
            ->whereIn('code', ['it', 'foreman'])
            ->delete();
    }
};
