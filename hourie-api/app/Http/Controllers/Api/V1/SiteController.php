<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sites\StoreSiteRequest;
use App\Http\Resources\Equipment\EquipmentSummaryResource;
use App\Models\Location;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SiteController extends Controller
{
    public function index(): JsonResponse
    {
        $projects = Project::query()
            ->with(['locations' => fn ($query) => $query->orderBy('parent_id')->orderBy('name')])
            ->withCount(['equipmentAssignments as active_equipment_count' => fn ($query) => $query->whereNull('ended_at')])
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $projects]);
    }

    public function store(StoreSiteRequest $request): JsonResponse
    {
        $project = DB::transaction(function () use ($request): Project {
            $project = Project::query()->create([
                ...$request->validated(),
                'is_active' => true,
            ]);
            Location::query()->create([
                'project_id' => $project->id,
                'name' => $project->name,
                'location_type' => 'project_site',
                'is_active' => true,
            ]);

            return $project;
        });

        return response()->json(['data' => $project->load('locations')], 201);
    }

    public function show(Request $request, Project $site): JsonResponse
    {
        $site->load([
            'locations' => fn ($query) => $query->orderBy('parent_id')->orderBy('name'),
            'equipmentAssignments' => fn ($query) => $query->whereNull('ended_at')->latest('assigned_at'),
            'equipmentAssignments.equipment.category',
            'equipmentAssignments.equipment.currentLocation.parent',
            'equipmentAssignments.equipment.currentLocation.project',
            'equipmentAssignments.equipment.currentProjectAssignment.project',
            'equipmentAssignments.equipment.custodian',
            'equipmentAssignments.equipment.generatorDetails',
        ]);

        $equipment = $site->equipmentAssignments
            ->pluck('equipment')
            ->filter()
            ->values();

        return response()->json(['data' => [
            'id' => $site->id,
            'code' => $site->code,
            'name' => $site->name,
            'is_active' => $site->is_active,
            'locations' => $site->locations,
            'equipment' => EquipmentSummaryResource::collection($equipment)->resolve($request),
        ]]);
    }
}
