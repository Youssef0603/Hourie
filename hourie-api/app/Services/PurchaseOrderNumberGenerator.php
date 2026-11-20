<?php

namespace App\Services;

use App\Models\Project;
use App\Models\PurchaseOrder;
use Carbon\CarbonInterface;

/**
 * Builds purchase order numbers of the form BC-{site cost code}-{yy}-{sequence},
 * e.g. BC-821-26-0001: the first order for site 821 in 2026.
 *
 * Must be called inside a database transaction so the row lock keeps two
 * simultaneous orders for the same site from receiving the same number.
 */
class PurchaseOrderNumberGenerator
{
    public function next(Project $project, CarbonInterface $orderedOn): string
    {
        $prefix = sprintf('BC-%s-%s-', $project->code, $orderedOn->format('y'));

        $lastNumber = PurchaseOrder::query()
            ->where('number', 'like', $prefix.'%')
            ->lockForUpdate()
            ->orderByDesc('number')
            ->value('number');

        $sequence = $lastNumber === null ? 1 : ((int) substr($lastNumber, strlen($prefix))) + 1;

        return $prefix.str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }
}
