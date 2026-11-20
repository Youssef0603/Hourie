<?php

namespace App\Models;

use Database\Factories\SubcontractFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['reference', 'subcontractor_id', 'project_id', 'created_by_user_id', 'title', 'signed_on', 'vat_rate', 'retention_rate', 'advance_amount', 'advance_recovery_rate', 'currency', 'status', 'notes'])]
class Subcontract extends Model
{
    /** @use HasFactory<SubcontractFactory> */
    use HasFactory;

    public function subcontractor(): BelongsTo
    {
        return $this->belongsTo(Subcontractor::class);
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SubcontractItem::class)->orderBy('position')->orderBy('id');
    }

    public function variations(): HasMany
    {
        return $this->hasMany(SubcontractVariation::class)->orderBy('sequence');
    }

    public function valuations(): HasMany
    {
        return $this->hasMany(SubcontractValuation::class)->orderBy('sequence');
    }

    /** The last valuation whose amounts are final (approved or paid). */
    public function lastCertifiedValuation(?int $beforeSequence = null): ?SubcontractValuation
    {
        return $this->valuations()
            ->whereIn('status', SubcontractValuation::CERTIFIED_STATUSES)
            ->when($beforeSequence !== null, fn ($query) => $query->where('sequence', '<', $beforeSequence))
            ->reorder('sequence', 'desc')
            ->first();
    }

    protected function casts(): array
    {
        return [
            'signed_on' => 'date:Y-m-d',
            'vat_rate' => 'decimal:2',
            'retention_rate' => 'decimal:2',
            'advance_amount' => 'decimal:2',
            'advance_recovery_rate' => 'decimal:2',
        ];
    }
}
