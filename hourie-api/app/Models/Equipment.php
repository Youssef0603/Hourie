<?php

namespace App\Models;

use App\Enums\EquipmentCondition;
use App\Enums\OperationalSituation;
use Database\Factories\EquipmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[Fillable([
    'equipment_category_id',
    'current_location_id',
    'custodian_employee_id',
    'asset_code',
    'brand',
    'model',
    'serial_number',
    'purchase_year',
    'condition',
    'operational_situation',
    'observations',
    'is_active',
])]
class Equipment extends Model
{
    /** @use HasFactory<EquipmentFactory> */
    use HasFactory;

    public function category(): BelongsTo
    {
        return $this->belongsTo(EquipmentCategory::class, 'equipment_category_id');
    }

    public function currentLocation(): BelongsTo
    {
        return $this->belongsTo(Location::class, 'current_location_id');
    }

    public function custodian(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'custodian_employee_id');
    }

    public function generatorDetails(): HasOne
    {
        return $this->hasOne(GeneratorDetail::class);
    }

    public function projectAssignments(): HasMany
    {
        return $this->hasMany(EquipmentProjectAssignment::class);
    }

    public function currentProjectAssignment(): HasOne
    {
        return $this->hasOne(EquipmentProjectAssignment::class)
            ->ofMany(['id' => 'max'], fn ($query) => $query->whereNull('ended_at'));
    }

    public function changes(): HasMany
    {
        return $this->hasMany(EquipmentChange::class);
    }

    public function maintenances(): HasMany
    {
        return $this->hasMany(EquipmentMaintenance::class)
            ->latest('maintenance_date')
            ->latest('id');
    }

    protected function casts(): array
    {
        return [
            'purchase_year' => 'integer',
            'condition' => EquipmentCondition::class,
            'operational_situation' => OperationalSituation::class,
            'is_active' => 'boolean',
        ];
    }
}
