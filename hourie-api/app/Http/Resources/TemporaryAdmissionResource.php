<?php

namespace App\Http\Resources;

use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TemporaryAdmissionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $expiresOn = $this->calculated_expires_on !== null
            ? CarbonImmutable::parse($this->calculated_expires_on)
            : $this->expiresOn();
        $status = in_array($this->status, ['returned', 'cleared'], true)
            ? $this->status
            : (($expiresOn?->isBefore(now()->startOfDay())) ? 'expired' : $this->status);

        return [
            'id' => $this->id,
            'customs_reference' => $this->customs_reference,
            'supplier_name' => $this->supplier_name,
            'entered_on' => $this->entered_on?->format('Y-m-d'),
            'validity_months' => 12,
            'expires_on' => $expiresOn?->format('Y-m-d'),
            'status' => $status,
            'returned_on' => $this->returned_on?->format('Y-m-d'),
            'closure_reason' => $this->closure_reason,
            'cleared_on' => $this->cleared_on?->format('Y-m-d'),
            'clearance_reference' => $this->clearance_reference,
            'customs_duty_amount' => $this->customs_duty_amount,
            'notes' => $this->notes,
            'documents_count' => $this->whenCounted('documents'),
            'equipment' => $this->whenLoaded('equipment', fn () => $this->equipment->map(fn ($item) => [
                'id' => $item->id,
                'asset_code' => $item->asset_code,
                'name' => trim(implode(' ', array_filter([$item->brand, $item->model]))) ?: $item->asset_code,
                'brand' => $item->brand,
                'model' => $item->model,
                'serial_number' => $item->serial_number,
            ])),
            'documents' => $this->whenLoaded('documents', fn () => $this->documents->map(fn ($document) => ['id' => $document->id, 'document_type' => $document->document_type, 'document_date' => $document->document_date?->format('Y-m-d'), 'validity_months' => $document->validity_months, 'original_name' => $document->original_name, 'size_bytes' => $document->size_bytes, 'url' => "/api/v1/temporary-admissions/{$this->id}/documents/{$document->id}/file"])),
            'changes' => $this->whenLoaded('changes', fn () => $this->changes->map(fn ($change) => [
                'id' => $change->id,
                'action' => $change->action,
                'actor' => $change->actor === null ? null : ['id' => $change->actor->id, 'name' => $change->actor->name],
                'occurred_at' => $change->occurred_at?->toISOString(),
            ])),
        ];
    }
}
