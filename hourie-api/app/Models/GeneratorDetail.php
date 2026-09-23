<?php

namespace App\Models;

use Database\Factories\GeneratorDetailFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'equipment_id',
    'apparent_power_kva',
    'active_power_kw',
    'phases',
    'voltage_rating',
    'frequency_hz',
    'current_rating',
    'fuel_type',
    'tank_capacity_litres',
    'current_engine_hours',
    'purchase_price_fcfa',
])]
class GeneratorDetail extends Model
{
    /** @use HasFactory<GeneratorDetailFactory> */
    use HasFactory;

    public $incrementing = false;

    protected $primaryKey = 'equipment_id';

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    protected function casts(): array
    {
        return [
            'apparent_power_kva' => 'decimal:2',
            'active_power_kw' => 'decimal:2',
            'frequency_hz' => 'decimal:2',
            'tank_capacity_litres' => 'decimal:2',
            'current_engine_hours' => 'decimal:2',
            'purchase_price_fcfa' => 'decimal:2',
        ];
    }
}
