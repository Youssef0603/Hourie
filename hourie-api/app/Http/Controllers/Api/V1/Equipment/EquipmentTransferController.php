<?php

namespace App\Http\Controllers\Api\V1\Equipment;

use App\Enums\EquipmentChangeSource;
use App\Enums\EquipmentChangeType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Equipment\TransferEquipmentRequest;
use App\Http\Resources\Equipment\EquipmentResource;
use App\Models\Equipment;
use App\Models\EquipmentChange;
use App\Models\EquipmentProjectAssignment;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EquipmentTransferController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(TransferEquipmentRequest $request, Equipment $equipment): EquipmentResource
    {
        $equipment->loadMissing('category');

        if ($equipment->category?->code !== 'generator') {
            throw ValidationException::withMessages([
                'equipment' => [__('validation.only_generators_transferable')],
            ]);
        }

        $data = $request->validated();

        DB::transaction(function () use ($data, $equipment, $request): void {
            $previousLocationId = $equipment->current_location_id;
            $currentAssignment = $equipment->currentProjectAssignment()->lockForUpdate()->first();
            $currentProjectId = $currentAssignment?->project_id;
            $submittedProjectId = $data['from_project_id'] ?? null;

            if ($currentProjectId !== $submittedProjectId) {
                throw ValidationException::withMessages([
                    'from_project_id' => [__('validation.transfer_source_changed')],
                ]);
            }

            $currentAssignment?->update(['ended_at' => now()]);

            EquipmentProjectAssignment::query()->create([
                'equipment_id' => $equipment->id,
                'project_id' => $data['to_project_id'],
                'assigned_by_user_id' => $request->user()->id,
                'assigned_at' => now(),
            ]);

            $equipment->update(['current_location_id' => $data['to_location_id'] ?? null]);

            EquipmentChange::query()->create([
                'equipment_id' => $equipment->id,
                'actor_user_id' => $request->user()->id,
                'change_type' => EquipmentChangeType::ProjectAssignmentChanged,
                'source' => EquipmentChangeSource::Transfer,
                'previous_values' => [
                    'project_id' => $data['from_project_id'],
                    'location_id' => $previousLocationId,
                ],
                'new_values' => [
                    'project_id' => $data['to_project_id'],
                    'location_id' => $data['to_location_id'],
                ],
                'occurred_at' => now(),
            ]);
        });

        return new EquipmentResource($equipment->fresh()->load([
            'category', 'currentLocation.parent', 'currentLocation.project',
            'currentProjectAssignment.project.responsible:id,name', 'custodian', 'generatorDetails',
            'maintenances.technician', 'maintenances.createdBy', 'images.uploader', 'invoices.uploader',
            'changes' => fn ($query) => $query->with('actor')->latest('occurred_at')->latest('id'),
        ]));
    }
}
