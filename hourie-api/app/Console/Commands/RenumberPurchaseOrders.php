<?php

namespace App\Console\Commands;

use App\Models\PurchaseOrder;
use App\Services\PurchaseOrderNumberGenerator;
use App\Services\PurchaseOrderPdfService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RenumberPurchaseOrders extends Command
{
    protected $signature = 'purchase-orders:renumber {--dry-run : Show the new numbers without saving them}';

    protected $description = 'Give purchase orders with a legacy number (0000821) a per-site number (BC-821-26-0001)';

    /**
     * Renumbers legacy orders oldest first, so each site's sequence follows the order dates.
     * Orders already numbered BC-… are left untouched, which makes the command safe to rerun.
     */
    public function handle(PurchaseOrderNumberGenerator $numberGenerator, PurchaseOrderPdfService $pdfService): int
    {
        $isDryRun = (bool) $this->option('dry-run');
        $renumbered = collect();

        DB::beginTransaction();

        try {
            $legacyOrders = PurchaseOrder::query()
                ->with('project:id,code,name')
                ->where('number', 'not like', 'BC-%')
                ->orderBy('ordered_on')
                ->orderBy('id')
                ->get();

            foreach ($legacyOrders as $purchaseOrder) {
                if (blank($purchaseOrder->project?->code)) {
                    $this->warn("{$purchaseOrder->number} skipped: it is not linked to a site with a cost code.");

                    continue;
                }

                $previousNumber = $purchaseOrder->number;
                $purchaseOrder->update([
                    'number' => $numberGenerator->next($purchaseOrder->project, $purchaseOrder->ordered_on),
                ]);
                $renumbered->push($purchaseOrder);
                $this->line("{$previousNumber} → {$purchaseOrder->number}");
            }

            $isDryRun ? DB::rollBack() : DB::commit();
        } catch (\Throwable $exception) {
            DB::rollBack();

            throw $exception;
        }

        if ($isDryRun) {
            $this->info("{$renumbered->count()} purchase order(s) would be renumbered. Nothing was saved.");

            return self::SUCCESS;
        }

        // The PDF carries the number, so each renumbered order gets a fresh document.
        $renumbered->each(fn (PurchaseOrder $purchaseOrder) => $pdfService->generateAndStore($purchaseOrder->fresh()));
        $this->info("{$renumbered->count()} purchase order(s) renumbered.");

        return self::SUCCESS;
    }
}
