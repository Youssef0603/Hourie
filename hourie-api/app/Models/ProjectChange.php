<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['project_id', 'actor_user_id', 'action', 'previous_values', 'new_values', 'occurred_at'])]
class ProjectChange extends Model
{
    public const UPDATED_AT = null;

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }

    protected function casts(): array
    {
        return [
            'previous_values' => 'array',
            'new_values' => 'array',
            'occurred_at' => 'datetime',
        ];
    }
}
