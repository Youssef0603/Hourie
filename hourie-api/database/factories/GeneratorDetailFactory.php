<?php

namespace Database\Factories;

use App\Models\Equipment;
use App\Models\GeneratorDetail;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<GeneratorDetail>
 */
class GeneratorDetailFactory extends Factory
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
            'apparent_power_kva' => fake()->randomFloat(2, 5, 500),
            'active_power_kw' => fake()->randomFloat(2, 4, 400),
            'phases' => '3 PH',
            'voltage_rating' => '400',
            'frequency_hz' => 50,
            'current_rating' => (string) fake()->numberBetween(10, 500),
            'fuel_type' => 'GASOIL',
            'tank_capacity_litres' => null,
            'current_engine_hours' => null,
            'purchase_price_fcfa' => null,
        ];
    }
}
