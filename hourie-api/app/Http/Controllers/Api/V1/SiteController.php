<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sites\StoreSiteRequest;
use App\Http\Requests\Sites\UpdateSiteRequest;
use App\Http\Resources\Equipment\EquipmentSummaryResource;
use App\Models\Equipment;
use App\Models\Location;
use App\Models\Project;
use App\Models\ProjectChange;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class SiteController extends Controller
{
    public function index(): JsonResponse
    {
        $projects = Project::query()
            ->where('is_active', true)
            ->with('responsible:id,name')
            ->with(['locations' => fn ($query) => $query->where('is_active', true)->orderBy('parent_id')->orderBy('name')])
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
                'responsible_employee_id' => $data['responsible_employee_id'] ?? null,
                'address' => $data['address'] ?? null,
                'start_date' => $data['start_date'] ?? null,
                'expected_end_date' => $data['expected_end_date'] ?? null,
                'notes' => $data['notes'] ?? null,
                'is_active' => true,
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

        $project->load('responsible:id,name', 'locations', 'changes.actor')
            ->loadCount(['equipmentAssignments as active_equipment_count' => fn ($query) => $query->whereNull('ended_at')]);

        return response()->json(['data' => $project], 201);
    }

    public function show(Request $request, Project $site): JsonResponse
    {
        $site->load([
            'locations' => fn ($query) => $query->where('is_active', true)->orderBy('parent_id')->orderBy('name'),
            'responsible:id,name',
            'equipmentAssignments' => fn ($query) => $query->whereNull('ended_at')->latest('assigned_at'),
            'equipmentAssignments.equipment.category',
            'equipmentAssignments.equipment.currentLocation.parent',
            'equipmentAssignments.equipment.currentLocation.project',
            'equipmentAssignments.equipment.currentProjectAssignment.project.responsible:id,name',
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
            'responsible' => $site->responsible === null ? null : ['id' => $site->responsible->id, 'name' => $site->responsible->name],
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

    public function update(UpdateSiteRequest $request, Project $site): JsonResponse
    {
        $site = DB::transaction(function () use ($request, $site): Project {
            $data = $request->validated();
            $site->load('locations');
            $previousValues = $this->auditValues($site);

            $site->update([
                'name' => $data['name'],
                'status' => $data['status'],
                'responsible_employee_id' => $data['responsible_employee_id'] ?? null,
                'address' => $data['address'] ?? null,
                'start_date' => $data['start_date'] ?? null,
                'expected_end_date' => $data['expected_end_date'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            $parent = $site->locations()->whereNull('parent_id')->firstOrCreate(
                ['location_type' => 'project_site'],
                ['name' => $site->name, 'is_active' => true],
            );
            $parent->update(['name' => $site->name, 'is_active' => true]);

            $retainedLocationIds = [];
            foreach ($data['locations'] as $locationData) {
                $location = isset($locationData['id'])
                    ? $site->locations()->whereKey($locationData['id'])->whereNotNull('parent_id')->firstOrFail()
                    : $site->locations()->make([
                        'parent_id' => $parent->id,
                        'location_type' => 'project_area',
                    ]);
                $location->fill(['name' => trim($locationData['name']), 'is_active' => true])->save();
                $retainedLocationIds[] = $location->id;
            }

            $removedLocationIds = $site->locations()
                ->whereNotNull('parent_id')
                ->whereNotIn('id', $retainedLocationIds)
                ->pluck('id');
            Equipment::query()->whereIn('current_location_id', $removedLocationIds)->update(['current_location_id' => null]);
            Location::query()->whereIn('id', $removedLocationIds)->update(['is_active' => false]);

            $site->refresh()->load(['locations' => fn ($query) => $query->where('is_active', true)->orderBy('parent_id')->orderBy('name')]);
            ProjectChange::query()->create([
                'project_id' => $site->id,
                'actor_user_id' => $request->user()->id,
                'action' => 'updated',
                'previous_values' => $previousValues,
                'new_values' => $this->auditValues($site),
                'occurred_at' => now(),
            ]);

            return $site;
        });

        $site->load('responsible:id,name')
            ->load(['changes' => fn ($query) => $query->with('actor')->limit(10)])
            ->loadCount(['equipmentAssignments as active_equipment_count' => fn ($query) => $query->whereNull('ended_at')]);

        return response()->json(['data' => $site]);
    }

    public function destroy(Request $request, Project $site): Response
    {
        abort_unless($request->user()->role->canManageSites(), 403);

        DB::transaction(function () use ($request, $site): void {
            $site->load('locations');
            $previousValues = $this->auditValues($site);
            $locationIds = $site->locations()->pluck('id');

            Equipment::query()
                ->whereIn('current_location_id', $locationIds)
                ->update(['current_location_id' => null]);
            $site->equipmentAssignments()->whereNull('ended_at')->update(['ended_at' => now()]);
            $site->locations()->update(['is_active' => false]);
            $site->update(['is_active' => false]);

            ProjectChange::query()->create([
                'project_id' => $site->id,
                'actor_user_id' => $request->user()->id,
                'action' => 'archived',
                'previous_values' => $previousValues,
                'new_values' => ['is_active' => false],
                'occurred_at' => now(),
            ]);
        });

        return response()->noContent();
    }

    /** @return array<string, mixed> */
    private function auditValues(Project $site): array
    {
        return [
            'project' => $site->only(['name', 'status', 'responsible_employee_id', 'address', 'start_date', 'expected_end_date', 'notes', 'is_active']),
            'locations' => $site->locations
                ->whereNotNull('parent_id')
                ->where('is_active', true)
                ->map(fn (Location $location) => ['id' => $location->id, 'name' => $location->name])
                ->values()
                ->all(),
        ];
    }
}
