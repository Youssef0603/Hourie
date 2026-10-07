<?php

namespace App\Actions\Equipment;

use App\Models\Equipment;
use App\Models\EquipmentCategory;
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
        $sort = $filters['sort'] ?? 'manufacture_year_desc';

        return $this->filteredQuery($filters)
            ->with([
                'category',
                'currentLocation.parent',
                'currentLocation.project',
                'currentProjectAssignment.project.responsible:id,name',
                'custodian',
                'generatorDetails',
            ])
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

    /**
     * Return all category totals after applying every filter except category.
     *
     * @param  array<string, mixed>  $filters
     * @return array<string, int>
     */
    public function categoryCounts(array $filters): array
    {
        return $this->filteredQuery($filters, includeCategory: false)
            ->join('equipment_categories', 'equipment_categories.id', '=', 'equipment.equipment_category_id')
            ->selectRaw('equipment_categories.code, COUNT(equipment.id) as aggregate')
            ->groupBy('equipment_categories.code')
            ->pluck('aggregate', 'equipment_categories.code')
            ->map(fn (mixed $count): int => (int) $count)
            ->all();
    }

    /** @param array<string, mixed> $filters */
    private function filteredQuery(array $filters, bool $includeCategory = true): Builder
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
        $assetField = $filters['asset_field'] ?? null;
        $categoryFields = EquipmentCategory::ASSET_CATEGORIES[$filters['category'] ?? '']['fields'] ?? [];

        return Equipment::query()
            ->where('equipment.is_active', true)
            ->when($filters['q'] ?? null, function (Builder $query, string $search): void {
                $query->where(function (Builder $query) use ($search): void {
                    $pattern = '%'.trim($search).'%';

                    $query
                        ->where('asset_code', 'like', $pattern)
                        ->orWhere('brand', 'like', $pattern)
                        ->orWhere('model', 'like', $pattern)
                        ->orWhere('serial_number', 'like', $pattern)
                        ->orWhere('asset_details', 'like', $pattern)
                        ->orWhere('observations', 'like', $pattern)
                        ->orWhereHas('custodian', fn (Builder $custodianQuery) => $custodianQuery
                            ->whereRaw('LOWER(name) like ?', ['%'.mb_strtolower(trim($search)).'%']));
                });
            })
            ->when($includeCategory ? ($filters['category'] ?? null) : null, function (Builder $query, string $category): void {
                $query->whereHas('category', fn (Builder $query) => $query->where('code', $category));
            })
            ->when($assetField !== null && isset($categoryFields[$assetField]) && ! empty($filters['asset_value']), function (Builder $query) use ($assetField, $filters): void {
                $column = $query->getQuery()->getGrammar()->wrap('asset_details->'.$assetField);
                $query->whereRaw("LOWER({$column}) like ?", ['%'.strtolower(trim($filters['asset_value'])).'%']);
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
            ->when($filters['chassis_number'] ?? null, fn (Builder $query, string $value) => $this->whereAssetText($query, 'chassis_number', $value))
            ->when(isset($filters['manufacture_year_from']), fn (Builder $query) => $query->where('manufacture_year', '>=', $filters['manufacture_year_from']))
            ->when(isset($filters['manufacture_year_to']), fn (Builder $query) => $query->where('manufacture_year', '<=', $filters['manufacture_year_to']))
            ->when($filters['equipment_type'] ?? null, fn (Builder $query, string $value) => $this->whereAssetText($query, 'equipment_type', $value))
            ->when($filters['sub_category'] ?? null, fn (Builder $query, string $value) => $this->whereAssetText($query, 'sub_category', $value))
            ->when($filters['asset_fuel_type'] ?? null, fn (Builder $query, string $value) => $this->whereAssetText($query, 'fuel_type', $value))
            ->when($filters['bungalow_type'] ?? null, fn (Builder $query, string $value) => $this->whereAssetText($query, 'bungalow_type', $value))
            ->when($filters['air_conditioning'] ?? null, fn (Builder $query, string $value) => $this->whereAssetText($query, 'air_conditioning', $value))
            ->when($filters['supplier'] ?? null, fn (Builder $query, string $value) => $this->whereAssetText($query, 'supplier', $value))
            ->when($filters['unassigned'] ?? false, fn (Builder $query) => $query->whereDoesntHave('currentProjectAssignment'))
            ->when($filters['inspection_status'] ?? null, function (Builder $query, string $status): void {
                $today = now()->toDateString();
                $limit = now()->addDays(30)->toDateString();
                $column = "JSON_UNQUOTE(JSON_EXTRACT(asset_details, '$.inspection_date'))";

                if ($status === 'expired') {
                    $query->whereRaw("{$column} <> '' and {$column} < ?", [$today]);
                } else {
                    $query->whereRaw("{$column} >= ? and {$column} <= ?", [$today, $limit]);
                }
            })
            ->when($filters['with_toilet'] ?? false, fn (Builder $query) => $this->whereAssetNumber($query, 'toilet_count', '>', 0))
            ->when($filters['with_shower'] ?? false, fn (Builder $query) => $this->whereAssetNumber($query, 'shower_count', '>', 0))
            ->when($filters['bungalow_group'] ?? null, function (Builder $query, string $group): void {
                $patterns = match ($group) {
                    'office' => ['%bureau%', '%flatpack%'],
                    'sanitary' => ['%toilette%', '%wc%', '%douche%'],
                    'guard' => ['%guérite%', '%guerite%'],
                };
                $column = "LOWER(JSON_UNQUOTE(JSON_EXTRACT(asset_details, '$.bungalow_type')))";
                $query->where(function (Builder $query) use ($patterns, $column): void {
                    foreach ($patterns as $pattern) {
                        $query->orWhereRaw("{$column} like ?", [$pattern]);
                    }
                });
            })
            ->when(isset($filters['odometer_km_min']), fn (Builder $query) => $this->whereAssetNumber($query, 'odometer_km', '>=', $filters['odometer_km_min']))
            ->when(isset($filters['odometer_km_max']), fn (Builder $query) => $this->whereAssetNumber($query, 'odometer_km', '<=', $filters['odometer_km_max']))
            ->when(isset($filters['length_m_min']), fn (Builder $query) => $this->whereAssetNumber($query, 'length_m', '>=', $filters['length_m_min']))
            ->when(isset($filters['length_m_max']), fn (Builder $query) => $this->whereAssetNumber($query, 'length_m', '<=', $filters['length_m_max']))
            ->when(isset($filters['width_m_min']), fn (Builder $query) => $this->whereAssetNumber($query, 'width_m', '>=', $filters['width_m_min']))
            ->when(isset($filters['width_m_max']), fn (Builder $query) => $this->whereAssetNumber($query, 'width_m', '<=', $filters['width_m_max']))
            ->when(isset($filters['height_m_min']), fn (Builder $query) => $this->whereAssetNumber($query, 'height_m', '>=', $filters['height_m_min']))
            ->when(isset($filters['height_m_max']), fn (Builder $query) => $this->whereAssetNumber($query, 'height_m', '<=', $filters['height_m_max']))
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
            });
    }

    private function whereAssetText(Builder $query, string $field, string $value): Builder
    {
        return $query->whereRaw(
            "LOWER(JSON_UNQUOTE(JSON_EXTRACT(asset_details, '$.{$field}'))) like ?",
            ['%'.mb_strtolower(trim($value)).'%'],
        );
    }

    private function whereAssetNumber(Builder $query, string $field, string $operator, int|float|string $value): Builder
    {
        return $query->whereRaw(
            "CAST(JSON_UNQUOTE(JSON_EXTRACT(asset_details, '$.{$field}')) AS DECIMAL(18, 4)) {$operator} ?",
            [$value],
        );
    }
}
