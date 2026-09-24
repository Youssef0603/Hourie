<?php

namespace Database\Factories;

use App\Enums\EquipmentCondition;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Equipment>
 */
class EquipmentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'equipment_category_id' => EquipmentCategory::factory(),
            'current_location_id' => null,
            'custodian_employee_id' => null,
            'asset_code' => fake()->unique()->bothify('AH-???-####'),
            'brand' => fake()->company(),
            'model' => fake()->bothify('MODEL-###'),
            'serial_number' => fake()->unique()->bothify('SN-########'),
            'manufacture_year' => fake()->numberBetween(2015, 2026),
            'purchase_date' => null,
            'condition' => EquipmentCondition::Good,
            'operational_situation' => null,
            'observations' => null,
            'is_active' => true,
        ];
    }
}
