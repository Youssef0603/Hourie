<?php

namespace App\Models;

use Database\Factories\TollBadgeFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A toll badge stuck on one of the company's cars or trucks. The balance is the last
 * one read on the operator's site or statement, with the date it was read:
 * Hourie does not see the passages, so it can be out of date.
 */
#[Fillable(['operator', 'badge_number', 'serial_number', 'subscription_number', 'registered_phone', 'equipment_id', 'status', 'balance', 'balance_checked_on', 'notes', 'created_by_user_id'])]
class TollBadge extends Model
{
    /** @use HasFactory<TollBadgeFactory> */
    use HasFactory;

    public const OPERATORS = ['hkb', 'fer', 'other'];

    public const STATUSES = ['active', 'inactive', 'lost'];

    public function equipment(): BelongsTo
    {
        return $this->belongsTo(Equipment::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    protected function casts(): array
    {
        return [
            'balance' => 'decimal:2',
            'balance_checked_on' => 'date:Y-m-d',
        ];
    }
}
