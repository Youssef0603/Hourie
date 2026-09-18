<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sites\StoreSiteRequest;
use App\Http\Resources\Equipment\EquipmentSummaryResource;
use App\Models\Location;
use App\Models\Project;
use App\Models\ProjectChange;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SiteController extends Controller
{
    public function index(): JsonResponse
    {
        $projects = Project::query()
            ->with(['locations' => fn ($query) => $query->orderBy('parent_id')->orderBy('name')])
            ->with(['changes' => fn ($query) => $query->with('actor')->limit(10)])
            ->withCount(['equipmentAssignments as active_equipment_count' => fn ($query) => $query->whereNull('ended_at')])
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $projects]);
    }

    public function store(StoreSiteRequest $request): JsonResponse
    {
        $project = DB::transaction(function () use ($request): Project {
            $data = $request->validated();
            $project = Project::query()->create([
                'name' => $data['name'],
                'code' => null,
                'status' => $data['status'],
                'address' => $data['address'] ?? null,
                'start_date' => $data['start_date'] ?? null,
                'expected_end_date' => $data['expected_end_date'] ?? null,
                'notes' => $data['notes'] ?? null,
                'is_active' => $data['status'] !== 'completed',
            ]);
            $parent = Location::query()->create([
                'project_id' => $project->id,
                'name' => $project->name,
                'location_type' => 'project_site',
                'is_active' => true,
            ]);

            foreach ($data['locations'] as $locationName) {
                Location::query()->create([
                    'project_id' => $project->id,
                    'parent_id' => $parent->id,
                    'name' => trim($locationName),
                    'location_type' => 'project_area',
                    'is_active' => true,
                ]);
            }

            ProjectChange::query()->create([
                'project_id' => $project->id,
                'actor_user_id' => $request->user()->id,
                'action' => 'created',
                'new_values' => [
                    'project' => $project->fresh()->toArray(),
                    'locations' => $data['locations'],
                ],
                'occurred_at' => now(),
            ]);

            return $project;
        });

        return response()->json(['data' => $project->load('locations', 'changes.actor')], 201);
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
            'changes.actor',
        ]);

        $equipment = $site->equipmentAssignments
            ->pluck('equipment')
            ->filter()
            ->values();

        return response()->json(['data' => [
            'id' => $site->id,
            'name' => $site->name,
            'is_active' => $site->is_active,
            'status' => $site->status,
            'address' => $site->address,
            'start_date' => $site->start_date?->format('Y-m-d'),
            'expected_end_date' => $site->expected_end_date?->format('Y-m-d'),
            'notes' => $site->notes,
            'locations' => $site->locations,
            'equipment' => EquipmentSummaryResource::collection($equipment)->resolve($request),
            'changes' => $site->changes->map(fn (ProjectChange $change) => [
                'id' => $change->id,
                'action' => $change->action,
                'actor' => $change->actor === null ? null : ['id' => $change->actor->id, 'name' => $change->actor->name],
                'occurred_at' => $change->occurred_at->toISOString(),
            ]),
        ]]);
    }
}
