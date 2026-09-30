<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['project_id', 'location_id', 'issuer', 'advance_payment_amount', 'performance_amount', 'retention_amount', 'amount', 'currency', 'issued_on', 'expires_on', 'notes', 'created_by_user_id'])]
class Bond extends Model
{
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function documents(): HasMany
    {
        return $this->hasMany(BondDocument::class);
    }

    public function changes(): HasMany
    {
        return $this->hasMany(BondChange::class)->latest('occurred_at')->latest('id');
    }

    protected function casts(): array
    {
        return [
            'advance_payment_amount' => 'decimal:2',
            'performance_amount' => 'decimal:2',
            'retention_amount' => 'decimal:2',
            'amount' => 'decimal:2',
            'issued_on' => 'date:Y-m-d',
            'expires_on' => 'date:Y-m-d',
        ];
    }
}
