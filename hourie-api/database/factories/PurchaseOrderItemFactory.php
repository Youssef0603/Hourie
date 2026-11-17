<?php

namespace Database\Factories;

use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PurchaseOrderItem>
 */
class PurchaseOrderItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'purchase_order_id' => PurchaseOrder::factory(),
            'position' => 1,
            'budget_code' => fake()->optional()->bothify('BUD-###'),
            'description' => fake()->sentence(),
            'quantity' => '1.000',
            'unit_price' => fake()->randomFloat(2, 100, 100000),
        ];
    }
}
