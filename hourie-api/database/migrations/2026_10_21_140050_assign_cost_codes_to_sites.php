<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $costCodes = [
            'Bureau' => '800',
            'Barrage B13' => '813',
            'Bassam' => '815',
            'Gesco' => '816',
            'Abidjan Tower' => '817',
            'PK27' => '819',
            'BX' => '820',
        ];

        foreach ($costCodes as $siteName => $costCode) {
            DB::table('projects')
                ->where('name', $siteName)
                ->where('is_active', true)
                ->update(['code' => $costCode, 'updated_at' => now()]);
        }
    }

    public function down(): void
    {
        $previousCodes = [
            'Bureau' => null,
            'Barrage B13' => 'B13',
            'Bassam' => null,
            'Gesco' => null,
            'Abidjan Tower' => null,
            'PK27' => 'PK27',
            'BX' => null,
        ];

        foreach ($previousCodes as $siteName => $costCode) {
            DB::table('projects')
                ->where('name', $siteName)
                ->where('is_active', true)
                ->update(['code' => $costCode, 'updated_at' => now()]);
        }
    }
};
