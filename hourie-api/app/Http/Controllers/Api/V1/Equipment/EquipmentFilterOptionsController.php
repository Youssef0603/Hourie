<?php

namespace App\Http\Controllers\Api\V1\Equipment;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\GeneratorDetail;
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
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'code', 'name']),
                'locations' => Location::query()
                    ->with('project:id,name')
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'project_id', 'parent_id', 'name', 'location_type']),
                'employees' => Employee::query()
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get(['id', 'name']),
                'fuel_types' => GeneratorDetail::query()
                    ->whereNotNull('fuel_type')
                    ->where('fuel_type', '!=', '')
                    ->distinct()
                    ->orderBy('fuel_type')
                    ->pluck('fuel_type')
                    ->values(),
            ],
        ]);
    }
}
