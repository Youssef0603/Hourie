<?php

namespace Database\Seeders;

use App\Models\EquipmentCategory;
use Illuminate\Database\Seeder;

class EquipmentCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        EquipmentCategory::query()->updateOrCreate(
            ['code' => 'generator'],
            ['name' => 'Générateurs', 'is_active' => true],
        );
    }
}
