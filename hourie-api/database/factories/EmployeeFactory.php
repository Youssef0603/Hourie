<?php

namespace Database\Factories;

use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Employee>
 */
class EmployeeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => null,
            'employee_code' => fake()->unique()->bothify('EMP-####'),
            'name' => fake()->name(),
            'phone_number' => '+225 '.fake()->numerify('## ## ## ## ##'),
            'is_active' => true,
        ];
    }
}
