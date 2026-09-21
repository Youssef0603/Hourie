<?php

namespace App\Actions\Equipment;

use App\Models\Equipment;
use App\Models\EquipmentMaintenance;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class ListMaintenanceWarnings
{
    private const int WARNING_HORIZON_DAYS = 14;

    /** @return array{warnings: LengthAwarePaginator<int, Equipment>, summary: array{overdue: int, due_soon: int, total: int, horizon_days: int}} */
    public function handle(int $perPage = 20): array
    {
        $today = CarbonImmutable::today();
        $warningLimit = $today->addDays(self::WARNING_HORIZON_DAYS);

        $query = Equipment::query()
            ->where('is_active', true)
            ->whereHas('latestMaintenance', function (Builder $query) use ($warningLimit): void {
                $query
                    ->whereNotNull('next_maintenance_date')
                    ->whereDate('next_maintenance_date', '<=', $warningLimit);
            });

        $overdue = (clone $query)
            ->whereHas('latestMaintenance', fn (Builder $query) => $query->whereDate('next_maintenance_date', '<', $today))
            ->count();

        $warnings = $query
            ->with([
                'category',
                'currentLocation.parent',
                'currentLocation.project',
                'currentProjectAssignment.project.responsible:id,name',
                'custodian',
                'generatorDetails',
                'latestMaintenance.technician',
            ])
            ->orderBy(EquipmentMaintenance::query()
                ->select('next_maintenance_date')
                ->whereColumn('equipment_id', 'equipment.id')
                ->orderByDesc('maintenance_date')
                ->orderByDesc('id')
                ->limit(1))
            ->orderBy('id')
            ->paginate($perPage)
            ->withQueryString();

        return [
            'warnings' => $warnings,
            'summary' => [
                'overdue' => $overdue,
                'due_soon' => $warnings->total() - $overdue,
                'total' => $warnings->total(),
                'horizon_days' => self::WARNING_HORIZON_DAYS,
            ],
        ];
    }
}
