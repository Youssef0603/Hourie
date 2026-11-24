<?php

namespace App\Services;

use App\Models\PurchaseOrder;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

class PurchaseOrderPdfService
{
    public function generateAndStore(PurchaseOrder $purchaseOrder): PurchaseOrder
    {
        $purchaseOrder->loadMissing(['items.subcontractMaterial.item:id,code,description', 'creator:id,name', 'deliveryNotes.uploader:id,name', 'invoices.uploader:id,name']);

        $options = new Options;
        $options->set('defaultFont', 'Times-Roman');
        $options->set('isRemoteEnabled', false);
        $options->set('isHtml5ParserEnabled', true);

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml(view('purchase-orders.pdf', [
            'purchaseOrder' => $purchaseOrder,
            'logoDataUri' => $this->dataUri(resource_path('images/logo-hourie.jpg'), 'image/jpeg'),
            'stampDataUri' => $this->dataUri(resource_path('images/hourie-stamp-transparent.png'), 'image/png'),
        ])->render());
        $dompdf->setPaper('a4', 'portrait');
        $dompdf->render();

        $disk = (string) config('filesystems.equipment_documents_disk');
        $path = "purchase-orders/{$purchaseOrder->id}/{$this->filename($purchaseOrder)}";
        $oldDisk = $purchaseOrder->pdf_disk;
        $oldPath = $purchaseOrder->pdf_path;

        if (! Storage::disk($disk)->put($path, $dompdf->output())) {
            throw new RuntimeException('Unable to store the purchase order PDF.');
        }

        if ($oldDisk && $oldPath && ($oldDisk !== $disk || $oldPath !== $path)) {
            Storage::disk($oldDisk)->delete($oldPath);
        }

        $purchaseOrder->forceFill([
            'pdf_disk' => $disk,
            'pdf_path' => $path,
            'pdf_generated_at' => now(),
        ])->saveQuietly();

        return $purchaseOrder->fresh()->load(['items.subcontractMaterial.item:id,code,description', 'creator:id,name', 'deliveryNotes.uploader:id,name', 'invoices.uploader:id,name']);
    }

    public function filename(PurchaseOrder $purchaseOrder): string
    {
        $supplier = Str::of($purchaseOrder->supplier_name)
            ->ascii()
            ->replaceMatches('/[^A-Za-z0-9]+/', '_')
            ->trim('_')
            ->upper();

        return 'Bon_de_commande_'.$purchaseOrder->number
            .($supplier->isNotEmpty() ? '_'.(string) $supplier : '').'.pdf';
    }

    private function dataUri(string $path, string $mimeType): string
    {
        $contents = file_get_contents($path);

        if ($contents === false) {
            throw new RuntimeException("Unable to read PDF image asset: {$path}");
        }

        return 'data:'.$mimeType.';base64,'.base64_encode($contents);
    }
}
