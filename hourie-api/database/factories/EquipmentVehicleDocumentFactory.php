<?php

namespace Database\Factories;

use App\Enums\VehicleDocumentType;
use App\Models\Equipment;
use App\Models\EquipmentVehicleDocument;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<EquipmentVehicleDocument>
 */
class EquipmentVehicleDocumentFactory extends Factory
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
            'document_type' => VehicleDocumentType::RegistrationCard,
            'issued_on' => '2026-01-01',
            'expires_on' => null,
            'disk' => 'equipment-documents',
            'path' => fake()->uuid().'.pdf',
            'original_name' => 'carte-grise.pdf',
            'mime_type' => 'application/pdf',
            'size_bytes' => 1024,
        ];
    }
}
