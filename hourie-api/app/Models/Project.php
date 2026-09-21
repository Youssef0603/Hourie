<?php

namespace App\Models;

use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['code', 'name', 'status', 'responsible_employee_id', 'address', 'start_date', 'expected_end_date', 'notes', 'is_active'])]
class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasFactory;

    public function responsible(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'responsible_employee_id');
    }

    public function locations(): HasMany
    {
        return $this->hasMany(Location::class);
    }

    public function equipmentAssignments(): HasMany
    {
        return $this->hasMany(EquipmentProjectAssignment::class);
    }

    public function changes(): HasMany
    {
        return $this->hasMany(ProjectChange::class)->latest('occurred_at')->latest('id');
    }

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'start_date' => 'date:Y-m-d',
            'expected_end_date' => 'date:Y-m-d',
        ];
    }
}
