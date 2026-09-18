<?php

namespace Database\Factories;

use App\Enums\EquipmentChangeSource;
use App\Enums\EquipmentChangeType;
use App\Models\Equipment;
use App\Models\EquipmentChange;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EquipmentChange>
 */
class EquipmentChangeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'equipment_id' => Equipment::factory(),
            'actor_user_id' => null,
            'equipment_import_id' => null,
            'change_type' => EquipmentChangeType::IdentityUpdated,
            'source' => EquipmentChangeSource::Manual,
            'previous_values' => null,
            'new_values' => ['asset_code' => fake()->bothify('AH-???-####')],
            'reason' => null,
            'occurred_at' => now(),
        ];
    }
}
