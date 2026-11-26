<?php

namespace App\Http\Resources;

use App\Models\TollBadge;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TollBadge
 */
class TollBadgeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'operator' => $this->operator,
            'badge_number' => $this->badge_number,
            'serial_number' => $this->serial_number,
            'subscription_number' => $this->subscription_number,
            'registered_phone' => $this->registered_phone,
            'status' => $this->status,
            'balance' => $this->balance,
            'balance_checked_on' => $this->balance_checked_on?->format('Y-m-d'),
            'notes' => $this->notes,
            'equipment_id' => $this->equipment_id,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
