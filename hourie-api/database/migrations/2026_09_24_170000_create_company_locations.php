<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('locations')->insert([
            ['project_id' => null, 'parent_id' => null, 'name' => 'BUREAU', 'location_type' => 'company_location', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
            ['project_id' => null, 'parent_id' => null, 'name' => 'GARAGE', 'location_type' => 'company_location', 'is_active' => true, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        DB::table('locations')
            ->whereNull('project_id')
            ->where('location_type', 'company_location')
            ->whereIn('name', ['BUREAU', 'GARAGE'])
            ->delete();
    }
};
