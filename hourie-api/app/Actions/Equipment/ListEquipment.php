<?php

namespace App\Actions\Equipment;

use App\Models\Equipment;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class ListEquipment
{
    /**
     * @param  array<string, mixed>  $filters
     * @return LengthAwarePaginator<int, Equipment>
     */
    public function handle(array $filters): LengthAwarePaginator
    {
        $generatorFilterKeys = [
            'apparent_power_kva_min', 'apparent_power_kva_max',
            'active_power_kw_min', 'active_power_kw_max',
            'frequency_hz_min', 'frequency_hz_max',
            'engine_hours_min', 'engine_hours_max',
            'tank_capacity_litres_min', 'tank_capacity_litres_max',
            'phases', 'voltage_rating', 'current_rating', 'fuel_type',
        ];
        $hasGeneratorFilters = collect($generatorFilterKeys)
            ->contains(fn (string $key): bool => isset($filters[$key]) && $filters[$key] !== '');
        $sort = $filters['sort'] ?? 'created_at_desc';

        return Equipment::query()
            ->where('is_active', true)
            ->with([
                'category',
                'currentLocation.parent',
                'currentLocation.project',
                'currentProjectAssignment.project.responsible:id,name',
                'custodian',
                'generatorDetails',
            ])
            ->when($filters['q'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $pattern = '%'.trim($search).'%';

                    $query
                        ->where('asset_code', 'like', $pattern)
                        ->orWhere('brand', 'like', $pattern)
                        ->orWhere('model', 'like', $pattern)
                        ->orWhere('serial_number', 'like', $pattern)
                        ->orWhere('observations', 'like', $pattern);
                });
            })
            ->when($filters['category'] ?? null, function (Builder $query, string $category): void {
                $query->whereHas('category', fn (Builder $query) => $query->where('code', $category));
            })
            ->when($filters['condition'] ?? null, fn (Builder $query, string $condition) => $query->where('condition', $condition))
            ->when(
                $filters['operational_situation'] ?? null,
                fn (Builder $query, string $situation) => $query->where('operational_situation', $situation),
            )
            ->when($filters['project_id'] ?? null, function (Builder $query, int $projectId): void {
                $query->whereHas('currentProjectAssignment', fn (Builder $query) => $query->where('project_id', $projectId));
            })
            ->when($filters['location_id'] ?? null, fn (Builder $query, int $locationId) => $query->where('current_location_id', $locationId))
            ->when($filters['custodian_employee_id'] ?? null, fn (Builder $query, int $employeeId) => $query->effectiveResponsible($employeeId))
            ->when($filters['brand'] ?? null, fn (Builder $query, string $value) => $query->where('brand', 'like', '%'.trim($value).'%'))
            ->when($filters['model'] ?? null, fn (Builder $query, string $value) => $query->where('model', 'like', '%'.trim($value).'%'))
            ->when($filters['serial_number'] ?? null, fn (Builder $query, string $value) => $query->where('serial_number', 'like', '%'.trim($value).'%'))
            ->when(isset($filters['manufacture_year_from']), fn (Builder $query) => $query->where('manufacture_year', '>=', $filters['manufacture_year_from']))
            ->when(isset($filters['manufacture_year_to']), fn (Builder $query) => $query->where('manufacture_year', '<=', $filters['manufacture_year_to']))
            ->when($filters['created_from'] ?? null, fn (Builder $query, string $date) => $query->whereDate('created_at', '>=', $date))
            ->when($filters['created_to'] ?? null, fn (Builder $query, string $date) => $query->whereDate('created_at', '<=', $date))
            ->when($hasGeneratorFilters, function (Builder $query) use ($filters): void {
                $query->whereHas('generatorDetails', function (Builder $query) use ($filters): void {
                    $rangeFilters = [
                        'apparent_power_kva' => ['apparent_power_kva_min', 'apparent_power_kva_max'],
                        'active_power_kw' => ['active_power_kw_min', 'active_power_kw_max'],
                        'frequency_hz' => ['frequency_hz_min', 'frequency_hz_max'],
                        'current_engine_hours' => ['engine_hours_min', 'engine_hours_max'],
                        'tank_capacity_litres' => ['tank_capacity_litres_min', 'tank_capacity_litres_max'],
                    ];

                    foreach ($rangeFilters as $column => [$minimum, $maximum]) {
                        if (isset($filters[$minimum])) {
                            $query->where($column, '>=', $filters[$minimum]);
                        }
                        if (isset($filters[$maximum])) {
                            $query->where($column, '<=', $filters[$maximum]);
                        }
                    }

                    foreach (['phases', 'voltage_rating', 'current_rating', 'fuel_type'] as $column) {
                        if (! empty($filters[$column])) {
                            $query->where($column, 'like', '%'.trim($filters[$column]).'%');
                        }
                    }
                });
            })
            ->when($sort === 'created_at_asc', fn (Builder $query) => $query->orderBy('created_at')->orderBy('id'))
            ->when($sort === 'created_at_desc', fn (Builder $query) => $query->orderByDesc('created_at')->orderByDesc('id'))
            ->when($sort === 'manufacture_year_asc', fn (Builder $query) => $query
                ->orderByRaw('CASE WHEN manufacture_year IS NULL THEN 1 ELSE 0 END')
                ->orderBy('manufacture_year')
                ->orderBy('id'))
            ->when($sort === 'manufacture_year_desc', fn (Builder $query) => $query
                ->orderByRaw('CASE WHEN manufacture_year IS NULL THEN 1 ELSE 0 END')
                ->orderByDesc('manufacture_year')
                ->orderByDesc('id'))
            ->paginate((int) ($filters['per_page'] ?? 20))
            ->withQueryString();
    }
}
