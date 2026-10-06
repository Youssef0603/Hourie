<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['temporary_admission_id', 'uploaded_by_user_id', 'document_type', 'document_date', 'disk', 'path', 'original_name', 'mime_type', 'size_bytes'])]
class TemporaryAdmissionDocument extends Model
{
    public const TYPES = ['initial', 'renewal', 'invoice'];

    public function temporaryAdmission(): BelongsTo
    {
        return $this->belongsTo(TemporaryAdmission::class);
    }

    protected function casts(): array
    {
        return ['document_date' => 'date:Y-m-d'];
    }
}
