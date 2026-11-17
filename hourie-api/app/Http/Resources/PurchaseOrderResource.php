<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseOrderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => str_pad((string) $this->number, 7, '0', STR_PAD_LEFT),
            'supplier_name' => $this->supplier_name,
            'supplier_phone' => $this->supplier_phone,
            'supplier_fax' => $this->supplier_fax,
            'ordered_on' => $this->ordered_on?->format('Y-m-d'),
            'follow_up_agent' => $this->follow_up_agent,
            'contact_name' => $this->contact_name,
            'project_name' => $this->project_name,
            'reason' => $this->reason,
            'prepared_by' => $this->prepared_by,
            'ordered_by' => $this->ordered_by,
            'approved_by' => $this->approved_by,
            'vat_rate' => $this->vat_rate,
            'currency' => $this->currency,
            'notes' => $this->notes,
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'position' => $item->position,
                'budget_code' => $item->budget_code,
                'description' => $item->description,
                'quantity' => $item->quantity,
                'unit_price' => $item->unit_price,
                'total' => (string) $item->subtotal(),
            ])),
            'subtotal' => (string) $this->subtotal(),
            'vat_amount' => (string) $this->vatAmount(),
            'total' => (string) $this->total(),
            'creator' => $this->whenLoaded('creator', fn () => [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
