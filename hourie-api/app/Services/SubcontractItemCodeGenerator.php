<?php

namespace App\Services;

use App\Models\Project;
use App\Models\SubcontractItem;

/**
 * Work item codes follow the site: {site cost code}-{sequence}, e.g. 821-07.
 * The sequence runs across every subcontract of the site, so a code always
 * identifies a single work item on that site. Call inside a transaction.
 */
class SubcontractItemCodeGenerator
{
    private ?int $lastSequence = null;

    public function __construct(private Project $project) {}

    public function next(): string
    {
        $this->lastSequence ??= $this->lastUsedSequence(lock: true);

        return self::format($this->project->code, ++$this->lastSequence);
    }

    /** The sequence number the next new item of this site will receive (for previews). */
    public function upcomingSequence(): int
    {
        return $this->lastUsedSequence(lock: false) + 1;
    }

    public static function format(string $siteCode, int $sequence): string
    {
        return $siteCode.'-'.str_pad((string) $sequence, 2, '0', STR_PAD_LEFT);
    }

    private function lastUsedSequence(bool $lock): int
    {
        $prefix = $this->project->code.'-';

        return SubcontractItem::query()
            ->whereHas('subcontract', fn ($query) => $query->where('project_id', $this->project->id))
            ->where('code', 'like', $prefix.'%')
            ->when($lock, fn ($query) => $query->lockForUpdate())
            ->pluck('code')
            ->map(fn (string $code): int => (int) substr($code, strlen($prefix)))
            ->max() ?? 0;
    }
}
