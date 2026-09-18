<?php

namespace App\Models;

use Database\Factories\EquipmentProjectAssignmentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable([
    'equipment_id',
    'project_id',
    'assigned_by_user_id',
    'equipment_import_id',
    'assigned_at',
    'ended_at',
    'reason',
])]
class EquipmentProjectAssignment extends Model
{
    /** @use HasFactory<EquipmentProjectAssignmentFactory> */
    use HasFactory;

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function assignedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by_user_id');
    }

    public function equipmentImport(): BelongsTo
    {
        return $this->belongsTo(EquipmentImport::class);
    }

    protected function casts(): array
    {
        return [
            'assigned_at' => 'datetime',
            'ended_at' => 'datetime',
        ];
    }
}
