<?php

namespace App\Services;

use App\Models\Project;
use App\Models\Subcontract;
use Carbon\CarbonInterface;

/**
 * Subcontract references follow the purchase order scheme:
 * SC-{site cost code}-{yy}-{sequence}, e.g. SC-821-26-01.
 * Must run inside a transaction so the row lock prevents duplicates.
 */
class SubcontractReferenceGenerator
{
    public function next(Project $project, CarbonInterface $date): string
    {
        $prefix = sprintf('SC-%s-%s-', $project->code, $date->format('y'));

        $lastReference = Subcontract::query()
            ->where('reference', 'like', $prefix.'%')
            ->lockForUpdate()
            ->orderByDesc('reference')
            ->value('reference');

        $sequence = $lastReference === null ? 1 : ((int) substr($lastReference, strlen($prefix))) + 1;

        return $prefix.str_pad((string) $sequence, 2, '0', STR_PAD_LEFT);
    }
}
