<?php

namespace Database\Factories;

use App\Models\PurchaseOrder;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PurchaseOrder>
 */
class PurchaseOrderFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'number' => fake()->unique()->numberBetween(1000, 9999999),
            'created_by_user_id' => User::factory(),
            'supplier_name' => fake()->company(),
            'supplier_phone' => fake()->phoneNumber(),
            'ordered_on' => fake()->date(),
            'project_name' => fake()->city(),
            'vat_rate' => '18.00',
            'currency' => 'XOF',
        ];
    }
}
