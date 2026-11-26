<?php

namespace Database\Factories;

use App\Models\Equipment;
use App\Models\TollBadge;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TollBadge>
 */
class TollBadgeFactory extends Factory
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
            'operator' => 'hkb',
            'badge_number' => '93840102'.fake()->unique()->numerify('###########'),
            'serial_number' => '50 - '.fake()->numerify('##########'),
            'status' => 'active',
            'balance' => fake()->randomElement([0, 500, 1500, 3000, 15000]),
            'balance_checked_on' => fake()->date(),
        ];
    }
}
