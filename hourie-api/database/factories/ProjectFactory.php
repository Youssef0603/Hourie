<?php

namespace Database\Factories;

use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => fake()->unique()->bothify('PRJ-###'),
            'name' => fake()->city(),
            'status' => 'active',
            'address' => fake()->address(),
            'start_date' => fake()->date(),
            'expected_end_date' => null,
            'notes' => null,
            'is_active' => true,
        ];
    }
}
