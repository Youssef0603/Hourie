<?php

namespace Database\Factories;

use App\Models\Equipment;
use App\Models\EquipmentInvoice;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EquipmentInvoice>
 */
class EquipmentInvoiceFactory extends Factory
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
            'uploaded_by_user_id' => User::factory(),
            'disk' => 'equipment-documents',
            'path' => fake()->uuid().'.pdf',
            'original_name' => 'facture-generator.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1024,
        ];
    }
}
