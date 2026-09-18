<?php

namespace App\Http\Controllers\Api\V1\Equipment;

use App\Actions\Equipment\CreateEquipment;
use App\Actions\Equipment\ListEquipment;
use App\Actions\Equipment\UpdateEquipment;
use App\Http\Controllers\Controller;
use App\Http\Requests\Equipment\ListEquipmentRequest;
use App\Http\Requests\Equipment\StoreEquipmentRequest;
use App\Http\Requests\Equipment\UpdateEquipmentRequest;
use App\Http\Resources\Equipment\EquipmentResource;
use App\Http\Resources\Equipment\EquipmentSummaryResource;
use App\Models\Equipment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
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
            'currentProjectAssignment.project',
            'custodian',
            'generatorDetails',
            'maintenances.technician',
            'maintenances.createdBy',
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
}
