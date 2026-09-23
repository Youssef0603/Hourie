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
        foreach (EquipmentCategory::ASSET_CATEGORIES as $code => $definition) {
            EquipmentCategory::query()->updateOrCreate(
                ['code' => $code],
                ['name' => $definition['name'], 'is_active' => true],
            );
        }
    }
}
