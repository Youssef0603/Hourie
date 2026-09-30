<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BondResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'issuer' => $this->issuer,
            'advance_payment_amount' => $this->advance_payment_amount,
            'performance_amount' => $this->performance_amount,
            'retention_amount' => $this->retention_amount,
            'amount' => $this->amount,
            'currency' => $this->currency,
            'issued_on' => $this->issued_on?->format('Y-m-d'),
            'expires_on' => $this->expires_on?->format('Y-m-d'),
            'notes' => $this->notes,
            'project' => $this->whenLoaded('project', fn () => ['id' => $this->project->id, 'name' => $this->project->name]),
            'location' => $this->whenLoaded('location', fn () => $this->location === null ? null : ['id' => $this->location->id, 'name' => $this->location->name]),
            'documents' => $this->whenLoaded('documents', fn () => $this->documents->map(fn ($document) => [
                'id' => $document->id,
                'original_name' => $document->original_name,
                'mime_type' => $document->mime_type,
                'size_bytes' => $document->size_bytes,
                'url' => "/api/v1/bonds/{$this->id}/documents/{$document->id}/file",
            ])),
            'changes' => $this->whenLoaded('changes', fn () => $this->changes->map(fn ($change) => [
                'id' => $change->id,
                'action' => $change->action,
                'actor' => $change->actor === null ? null : ['id' => $change->actor->id, 'name' => $change->actor->name],
                'occurred_at' => $change->occurred_at?->toISOString(),
            ])),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
