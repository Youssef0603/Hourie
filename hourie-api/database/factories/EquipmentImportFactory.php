<?php

namespace Database\Factories;

use App\Enums\EquipmentImportStatus;
use App\Models\EquipmentImport;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EquipmentImport>
 */
class EquipmentImportFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'imported_by_user_id' => null,
            'original_filename' => 'equipment-'.fake()->uuid().'.xlsx',
            'file_sha256' => hash('sha256', fake()->uuid()),
            'status' => EquipmentImportStatus::Pending,
            'imported_at' => null,
            'summary' => null,
        ];
    }
}
