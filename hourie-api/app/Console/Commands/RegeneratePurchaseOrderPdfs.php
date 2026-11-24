<?php

namespace App\Console\Commands;

use App\Models\PurchaseOrder;
use App\Services\PurchaseOrderPdfService;
use Illuminate\Console\Command;

class RegeneratePurchaseOrderPdfs extends Command
{
    protected $signature = 'purchase-orders:regenerate-pdfs';

    protected $description = 'Redraw the stored PDF of every purchase order, e.g. after the PDF layout or logo changed';

    /**
     * Each PDF is a stored file drawn when the order is saved, so layout changes
     * only reach existing orders through this command. Safe to rerun.
     */
    public function handle(PurchaseOrderPdfService $pdfService): int
    {
        $regenerated = 0;

        PurchaseOrder::query()->orderBy('id')->each(function (PurchaseOrder $purchaseOrder) use ($pdfService, &$regenerated): void {
            $pdfService->generateAndStore($purchaseOrder);
            $this->line($purchaseOrder->number);
            $regenerated++;
        });

        $this->info("{$regenerated} purchase order PDF(s) regenerated.");

        return self::SUCCESS;
    }
}
