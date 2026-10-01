<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['project_id', 'location_id', 'bond_type', 'issuer', 'amount', 'currency', 'issued_on', 'expires_on', 'notes', 'created_by_user_id'])]
class Bond extends Model
{
    public const TYPES = ['advance_payment', 'performance', 'retention'];

    public function typeLabel(): string
    {
        return match ($this->bond_type) {
            'advance_payment' => 'Avance de démarrage',
            'retention' => 'Retenue de garantie',
            default => 'Bonne exécution',
        };
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function documents(): BelongsToMany
    {
        return $this->belongsToMany(BondDocument::class, 'bond_document_links');
    }

    public function changes(): HasMany
    {
        return $this->hasMany(BondChange::class)->latest('occurred_at')->latest('id');
    }

    public function reminders(): HasMany
    {
        return $this->hasMany(BondReminder::class);
    }

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'issued_on' => 'date:Y-m-d',
            'expires_on' => 'date:Y-m-d',
        ];
    }
}
