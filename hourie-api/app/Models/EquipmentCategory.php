<?php

namespace App\Models;

use Database\Factories\EquipmentCategoryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'name', 'is_active'])]
class EquipmentCategory extends Model
{
    /** @use HasFactory<EquipmentCategoryFactory> */
    use HasFactory;

    /** @var array<string, array{name: string, prefix: string, fields: array<string, string>}> */
    public const ASSET_CATEGORIES = [
        'generator' => ['name' => 'Générateurs', 'prefix' => 'GEN', 'fields' => []],
        'tower_crane' => ['name' => 'Grues à tour', 'prefix' => 'GRT', 'fields' => ['lifting_capacity_tonnes' => 'number', 'jib_length_m' => 'number', 'hook_height_m' => 'number']],
        'hoist' => ['name' => 'Monte-charges', 'prefix' => 'MCH', 'fields' => ['load_capacity_kg' => 'number', 'lifting_height_m' => 'number', 'platform_length_m' => 'number']],
        'equipment' => ['name' => 'Matériel', 'prefix' => 'MAT', 'fields' => ['equipment_type' => 'text', 'capacity' => 'text', 'power_source' => 'text']],
        'formwork_scaffolding' => ['name' => 'Coffrage et échafaudage', 'prefix' => 'COF', 'fields' => ['system_type' => 'text', 'quantity' => 'number', 'unit' => 'text']],
        'portacabin' => ['name' => 'Bungalows', 'prefix' => 'BUN', 'fields' => ['length_m' => 'number', 'width_m' => 'number', 'purpose' => 'text']],
        'car' => ['name' => 'Voitures', 'prefix' => 'VOI', 'fields' => ['registration_number' => 'text', 'vehicle_type' => 'text', 'fuel_type' => 'text', 'odometer_km' => 'number']],
        'truck_dumper' => ['name' => 'Camions et bennes', 'prefix' => 'CAM', 'fields' => ['registration_number' => 'text', 'payload_tonnes' => 'number', 'fuel_type' => 'text', 'odometer_km' => 'number']],
    ];

    public function equipment(): HasMany
    {
        return $this->hasMany(Equipment::class);
    }

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }
}
