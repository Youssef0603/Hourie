<?php

namespace App\Http\Resources;

use Brick\Math\BigDecimal;
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
            'number' => $this->number,
            'supplier_name' => $this->supplier_name,
            'supplier_phone' => $this->supplier_phone,
            'supplier_fax' => $this->supplier_fax,
            'ordered_on' => $this->ordered_on?->format('Y-m-d'),
            'follow_up_agent' => $this->follow_up_agent,
            'contact_name' => $this->contact_name,
            'project_id' => $this->project_id,
            'project_name' => $this->project_name,
            'reason' => $this->reason,
            'prepared_by' => $this->prepared_by,
            'ordered_by' => $this->ordered_by,
            'approved_by' => $this->approved_by,
            'vat_rate' => $this->vat_rate,
            'currency' => $this->currency,
            'notes' => $this->notes,
            'pdf_url' => route('purchase-orders.pdf', $this->resource, false),
            'pdf_generated_at' => $this->pdf_generated_at?->toISOString(),
            'delivery_notes' => $this->whenLoaded('deliveryNotes', fn () => $this->deliveryNotes->map(fn ($document) => [
                'id' => $document->id,
                'url' => route('purchase-orders.delivery-notes.show', [$this->resource, $document], false),
                'original_name' => $document->original_name,
                'mime_type' => $document->mime_type,
                'size_bytes' => $document->size_bytes,
                'uploaded_by' => $document->uploader === null ? null : [
                    'id' => $document->uploader->id,
                    'name' => $document->uploader->name,
                ],
                'created_at' => $document->created_at?->toISOString(),
            ])),
            'invoices' => $this->whenLoaded('invoices', fn () => $this->invoices->map(fn ($invoice) => [
                'id' => $invoice->id,
                'invoice_number' => $invoice->invoice_number,
                'invoiced_on' => $invoice->invoiced_on?->format('Y-m-d'),
                'amount' => $invoice->amount,
                'url' => route('purchase-orders.invoices.show', [$this->resource, $invoice], false),
                'original_name' => $invoice->original_name,
                'size_bytes' => $invoice->size_bytes,
                'created_at' => $invoice->created_at?->toISOString(),
            ])->values()),
            'invoice_check' => $this->whenLoaded('invoices', fn () => $this->invoiceCheck()),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'position' => $item->position,
                'budget_code' => $item->budget_code,
                'subcontract_item_material_id' => $item->subcontract_item_material_id,
                'material_label' => $item->subcontractMaterial
                    ? $item->subcontractMaterial->item->code.' · '.$item->subcontractMaterial->item->description.' — '.$item->subcontractMaterial->name
                    : null,
                'description' => $item->description,
                'quantity' => $item->quantity,
                'unit' => $item->unit,
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

    /**
     * Three-way match: what was ordered (this purchase order), what was
     * received (delivery notes) and what the supplier billed (invoices).
     *
     * @return array{status: string, invoiced_total: string, difference: string, has_delivery_note: bool}
     */
    private function invoiceCheck(): array
    {
        $invoiced = $this->invoices->reduce(fn (BigDecimal $total, $invoice) => $total->plus((string) $invoice->amount), BigDecimal::zero());
        $difference = $invoiced->minus($this->total());
        $hasDeliveryNote = $this->relationLoaded('deliveryNotes') && $this->deliveryNotes->isNotEmpty();

        $status = match (true) {
            $this->invoices->isEmpty() => 'not_invoiced',
            ! $difference->isZero() => 'amount_mismatch',
            ! $hasDeliveryNote => 'missing_delivery_note',
            default => 'matched',
        };

        return [
            'status' => $status,
            'invoiced_total' => (string) $invoiced->toScale(2),
            'difference' => (string) $difference->toScale(2),
            'has_delivery_note' => $hasDeliveryNote,
        ];
    }
}
