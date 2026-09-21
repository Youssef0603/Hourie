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

        return response()->json([
            'data' => [
                'categories' => EquipmentCategory::query()
                    ->orderBy('name')
                    ->get(['id', 'code', 'name']),
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
            ],
        ]);
    }
}
