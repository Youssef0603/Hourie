<?php

namespace Database\Factories;

use App\Models\Equipment;
use App\Models\EquipmentGeneratorDocument;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EquipmentGeneratorDocument>
 */
class EquipmentGeneratorDocumentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'equipment_id' => Equipment::factory(),
            'uploaded_by_user_id' => User::factory(),
            'disk' => 'equipment-documents',
            'path' => fake()->uuid().'.pdf',
            'original_name' => 'manuel-entretien.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1024,
        ];
    }
}
