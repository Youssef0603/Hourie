<?php

namespace App\Http\Controllers\Api\V1\Equipment;

use App\Http\Controllers\Controller;
use App\Models\CatalogOption;
use App\Models\Employee;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\Location;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class EquipmentFilterOptionsController extends Controller
{
    public function __invoke(): JsonResponse
    {
        Gate::authorize('viewAny', Equipment::class);

        $assetFilterFields = [
            'equipment' => ['equipment_type', 'sub_category', 'brand'],
            'car' => ['fuel_type'],
            'truck_dumper' => ['vehicle_type', 'fuel_type'],
            'portacabin' => ['bungalow_type', 'air_conditioning', 'supplier'],
        ];
        $assetFilterValues = [];

        Equipment::query()
            ->where('is_active', true)
            ->with('category:id,code')
            ->get(['id', 'equipment_category_id', 'brand', 'asset_details'])
            ->each(function (Equipment $equipment) use (&$assetFilterValues, $assetFilterFields): void {
                $category = $equipment->category?->code;
                if ($category === null || ! isset($assetFilterFields[$category])) {
                    return;
                }

                $details = $equipment->asset_details ?? [];

                foreach ($assetFilterFields[$category] as $field) {
                    $value = trim((string) ($field === 'brand' ? $equipment->brand : ($details[$field] ?? '')));
                    if ($value !== '') {
                        $assetFilterValues[$category][$field][mb_strtolower($value)] = $value;
                    }
                }
            });

        foreach ($assetFilterValues as $category => $fields) {
            foreach ($fields as $field => $values) {
                natcasesort($values);
                $assetFilterValues[$category][$field] = array_values($values);
            }
        }

        return response()->json([
            'data' => [
                'categories' => EquipmentCategory::query()
                    ->select(['id', 'code', 'name'])
                    ->withCount([
                        'equipment as equipment_count' => fn ($query) => $query->where('is_active', true),
                    ])
                    ->orderBy('name')
                    ->get(),
                'projects' => Project::query()
                    ->with('responsible:id,name')
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'code', 'name', 'responsible_employee_id']),
                'locations' => Location::query()
                    ->with('project:id,name')
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'project_id', 'parent_id', 'name', 'location_type']),
                'employees' => Employee::query()
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'name']),
                'fuel_types' => CatalogOption::query()->where('group', 'fuel_type')->where('is_active', true)->orderBy('sort_order')->pluck('code')->values(),
                'catalogs' => CatalogOption::query()->orderBy('sort_order')->get(['id', 'group', 'code', 'label_fr', 'label_ar', 'color', 'sort_order', 'is_active']),
                'asset_filter_values' => $assetFilterValues,
            ],
        ]);
    }
}
