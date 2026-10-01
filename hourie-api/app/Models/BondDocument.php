<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

#[Fillable(['bond_id', 'uploaded_by_user_id', 'disk', 'path', 'original_name', 'mime_type', 'size_bytes'])]
class BondDocument extends Model
{
    public function bond(): BelongsTo
    {
        return $this->belongsTo(Bond::class);
    }

    public function bonds(): BelongsToMany
    {
        return $this->belongsToMany(Bond::class, 'bond_document_links');
    }
}
