<?php

namespace App\Models;

use Database\Factories\EquipmentMaintenanceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'equipment_id',
    'technician_employee_id',
    'created_by_user_id',
    'maintenance_date',
    'engine_hours',
    'intervention_type',
    'oil_changed',
    'oil_quantity_litres',
    'oil_filter_changed',
    'fuel_filter_changed',
    'air_filter_changed',
    'battery_serviced',
    'coolant_serviced',
    'technician_name',
    'next_maintenance_date',
    'cost',
    'cost_currency',
    'observations',
])]
class EquipmentMaintenance extends Model
{
    /** @use HasFactory<EquipmentMaintenanceFactory> */
    use HasFactory;

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function technician(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'technician_employee_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    protected function casts(): array
    {
        return [
            'maintenance_date' => 'date:Y-m-d',
            'engine_hours' => 'decimal:2',
            'oil_changed' => 'boolean',
            'oil_quantity_litres' => 'decimal:2',
            'oil_filter_changed' => 'boolean',
            'fuel_filter_changed' => 'boolean',
            'air_filter_changed' => 'boolean',
            'battery_serviced' => 'boolean',
            'coolant_serviced' => 'boolean',
            'next_maintenance_date' => 'date:Y-m-d',
            'cost' => 'decimal:2',
        ];
    }
}
