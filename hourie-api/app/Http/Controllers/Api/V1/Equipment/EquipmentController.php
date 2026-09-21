<?php

namespace App\Http\Controllers\Api\V1\Equipment;

use App\Actions\Equipment\CreateEquipment;
use App\Actions\Equipment\ListEquipment;
use App\Actions\Equipment\UpdateEquipment;
use App\Enums\EquipmentChangeSource;
use App\Enums\EquipmentChangeType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Equipment\ListEquipmentRequest;
use App\Http\Requests\Equipment\StoreEquipmentRequest;
use App\Http\Requests\Equipment\UpdateEquipmentRequest;
use App\Http\Resources\Equipment\EquipmentResource;
use App\Http\Resources\Equipment\EquipmentSummaryResource;
use App\Models\Equipment;
use App\Models\EquipmentChange;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class EquipmentController extends Controller
{
    public function store(StoreEquipmentRequest $request, CreateEquipment $createEquipment): JsonResponse
    {
        $equipment = $createEquipment->handle($request->validated(), $request->user());

        return (new EquipmentResource($this->loadDetails($equipment)))
            ->response()
            ->setStatusCode(201);
    }

    public function index(ListEquipmentRequest $request, ListEquipment $listEquipment): AnonymousResourceCollection
    {
        return EquipmentSummaryResource::collection($listEquipment->handle($request->validated()));
    }

    public function show(Equipment $equipment): EquipmentResource
    {
        Gate::authorize('view', $equipment);

        return new EquipmentResource($this->loadDetails($equipment));
    }

    private function loadDetails(Equipment $equipment): Equipment
    {
        return $equipment->load([
            'category',
            'currentLocation.parent',
            'currentLocation.project',
            'currentProjectAssignment.project.responsible:id,name',
            'custodian',
            'generatorDetails',
            'maintenances.technician',
            'maintenances.createdBy',
            'images.uploader',
            'changes' => fn ($query) => $query->with('actor')->latest('occurred_at')->latest('id'),
        ]);

    }

    public function update(
        UpdateEquipmentRequest $request,
        Equipment $equipment,
        UpdateEquipment $updateEquipment,
    ): EquipmentResource {
        $equipment = $updateEquipment->handle($equipment, $request->validated(), $request->user());

        return new EquipmentResource($this->loadDetails($equipment));
    }

    public function destroy(Request $request, Equipment $equipment): Response
    {
        Gate::authorize('delete', $equipment);

        DB::transaction(function () use ($equipment, $request): void {
            $previousValues = $equipment->only(['is_active', 'current_location_id', 'custodian_employee_id']);
            $equipment->currentProjectAssignment()->update(['ended_at' => now()]);
            $equipment->update([
                'is_active' => false,
                'current_location_id' => null,
                'custodian_employee_id' => null,
            ]);

            EquipmentChange::query()->create([
                'equipment_id' => $equipment->id,
                'actor_user_id' => $request->user()->id,
                'change_type' => EquipmentChangeType::Archived,
                'source' => EquipmentChangeSource::Manual,
                'previous_values' => $previousValues,
                'new_values' => ['is_active' => false],
                'occurred_at' => now(),
            ]);
        });

        return response()->noContent();
    }
}
