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
        'tower_crane' => ['name' => 'Grues', 'prefix' => 'GR', 'fields' => ['crane_type' => 'text', 'sub_category' => 'text', 'counter_at_purchase' => 'text', 'purchase_price' => 'text', 'shipping_cost' => 'text', 'official_document_type' => 'text', 'official_document_location' => 'text']],
        'hoist' => ['name' => 'Monte-charges', 'prefix' => 'MCH', 'fields' => ['load_capacity_kg' => 'number', 'lifting_height_m' => 'number', 'platform_length_m' => 'number']],
        'equipment' => ['name' => 'Matériel', 'prefix' => 'MAT', 'fields' => ['equipment_type' => 'text', 'sub_category' => 'text', 'power_source' => 'text', 'counter_at_purchase' => 'text', 'purchase_price' => 'text', 'shipping_cost' => 'text', 'official_document_type' => 'text', 'official_document_location' => 'text']],
        'formwork_scaffolding' => ['name' => 'Coffrage et échafaudage', 'prefix' => 'COF', 'fields' => ['system_type' => 'text', 'quantity' => 'number', 'unit' => 'text', 'sub_category' => 'text', 'purchase_price' => 'text', 'shipping_cost' => 'text', 'official_document_type' => 'text', 'official_document_location' => 'text']],
        'portacabin' => ['name' => 'Bungalows', 'prefix' => 'BUN', 'fields' => [
            'bungalow_type' => 'text',
            'length_m' => 'number',
            'width_m' => 'number',
            'height_m' => 'number',
            'water_tank_capacity_l' => 'number',
            'door_count' => 'number',
            'window_count' => 'number',
            'toilet_count' => 'number',
            'washbasin_count' => 'number',
            'mirror_count' => 'number',
            'shower_count' => 'number',
            'electrical_installation' => 'text',
            'air_conditioning' => 'text',
            'purpose' => 'text',
            'supplier' => 'text',
            'invoice_number' => 'text',
            'purchase_price' => 'text',
            'shipping_cost' => 'text',
            'official_document_type' => 'text',
            'official_document_location' => 'text',
        ]],
        'car' => ['name' => 'Voitures', 'prefix' => 'VOI', 'fields' => ['chassis_number' => 'text', 'inspection_date' => 'date', 'fuel_type' => 'text', 'odometer_km' => 'number', 'counter_at_purchase' => 'text', 'purchase_price' => 'text', 'shipping_cost' => 'text', 'official_document_type' => 'text', 'official_document_location' => 'text']],
        'truck_dumper' => ['name' => 'Camions et bennes', 'prefix' => 'CAM', 'fields' => ['vehicle_type' => 'text', 'payload_tonnes' => 'number', 'fuel_type' => 'text', 'odometer_km' => 'number', 'counter_at_purchase' => 'text', 'purchase_price' => 'text', 'shipping_cost' => 'text', 'official_document_type' => 'text', 'official_document_location' => 'text']],
    ];

    public static function assetCode(string $categoryCode, int $equipmentId): string
    {
        $prefix = self::ASSET_CATEGORIES[$categoryCode]['prefix'];

        return 'A.H-'.$prefix.'-'.str_pad((string) $equipmentId, 3, '0', STR_PAD_LEFT);
    }

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
