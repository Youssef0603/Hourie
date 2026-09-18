<?php

namespace Database\Factories;

use App\Enums\EquipmentImportRowStatus;
use App\Models\EquipmentImport;
use App\Models\EquipmentImportRow;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EquipmentImportRow>
 */
class EquipmentImportRowFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'equipment_import_id' => EquipmentImport::factory(),
            'equipment_id' => null,
            'sheet_name' => 'Sheet1',
            'row_number' => fake()->unique()->numberBetween(2, 10000),
            'source_asset_code' => null,
            'status' => EquipmentImportRowStatus::Pending,
            'raw_data' => [],
            'messages' => null,
        ];
    }
}
