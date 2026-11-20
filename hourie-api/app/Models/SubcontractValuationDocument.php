<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['valuation_id', 'type', 'uploaded_by_user_id', 'disk', 'path', 'original_name', 'mime_type', 'size_bytes'])]
class SubcontractValuationDocument extends Model
{
    public const TYPE_STATEMENT = 'statement';

    public const TYPE_INVOICE = 'invoice';

    public function valuation(): BelongsTo
    {
        return $this->belongsTo(SubcontractValuation::class, 'valuation_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by_user_id');
    }
}
