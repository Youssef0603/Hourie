<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['subcontract_id', 'sequence', 'title', 'reason', 'approved_on', 'created_by_user_id'])]
class SubcontractVariation extends Model
{
    public function subcontract(): BelongsTo
    {
        return $this->belongsTo(Subcontract::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(SubcontractVariationLine::class, 'variation_id');
    }

    public function reference(): string
    {
        return 'AV-'.str_pad((string) $this->sequence, 2, '0', STR_PAD_LEFT);
    }

    protected function casts(): array
    {
        return ['approved_on' => 'date:Y-m-d'];
    }
}
