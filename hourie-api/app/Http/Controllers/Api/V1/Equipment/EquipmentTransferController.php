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
use App\Models\Location;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class EquipmentTransferController extends Controller
{
    /**
     * Handle the incoming request.
     */
    public function __invoke(TransferEquipmentRequest $request, Equipment $equipment): EquipmentResource
    {
        $data = $request->validated();

        DB::transaction(function () use ($data, $equipment, $request): void {
            $previousLocationId = $equipment->current_location_id;
            $previousLocation = $previousLocationId === null ? null : Location::query()->find($previousLocationId);
            $currentAssignment = $equipment->currentProjectAssignment()->with('project')->lockForUpdate()->first();
            $currentProjectId = $currentAssignment?->project_id;
            $submittedProjectId = $data['from_project_id'] ?? null;

            if ($currentProjectId !== $submittedProjectId) {
                throw ValidationException::withMessages([
                    'from_project_id' => [__('validation.transfer_source_changed')],
                ]);
            }

            $destinationProject = Project::query()->findOrFail($data['to_project_id']);
            $destinationLocation = $data['to_location_id'] === null
                ? null
                : Location::query()->findOrFail($data['to_location_id']);

            $currentAssignment?->update(['ended_at' => now()]);

            $newAssignment = EquipmentProjectAssignment::query()->create([
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
                    'project_assignment_id' => $currentAssignment?->id,
                    'project_id' => $data['from_project_id'],
                    'location_id' => $previousLocationId,
                    'project_name' => $currentAssignment?->project?->name,
                    'location_name' => $previousLocation?->name,
                ],
                'new_values' => [
                    'project_assignment_id' => $newAssignment->id,
                    'project_id' => $data['to_project_id'],
                    'location_id' => $data['to_location_id'],
                    'project_name' => $destinationProject->name,
                    'location_name' => $destinationLocation?->name,
                ],
                'occurred_at' => now(),
            ]);
        });

        return $this->resource($equipment);
    }

    public function destroy(Request $request, Equipment $equipment, EquipmentChange $change): EquipmentResource
    {
        Gate::authorize('update', $equipment);

        DB::transaction(function () use ($change, $equipment, $request): void {
            $latestTransfer = EquipmentChange::query()
                ->where('equipment_id', $equipment->id)
                ->where('source', EquipmentChangeSource::Transfer)
                ->latest('occurred_at')
                ->latest('id')
                ->lockForUpdate()
                ->first();

            if ($change->equipment_id !== $equipment->id
                || $change->source !== EquipmentChangeSource::Transfer
                || $latestTransfer?->id !== $change->id) {
                throw ValidationException::withMessages([
                    'transfer' => [__('validation.only_latest_transfer_removable')],
                ]);
            }

            $previous = $change->previous_values ?? [];
            $next = $change->new_values ?? [];
            $currentAssignment = $equipment->currentProjectAssignment()->lockForUpdate()->first();
            $expectedAssignmentId = $next['project_assignment_id'] ?? null;
            $expectedProjectId = $next['project_id'] ?? null;

            if (($expectedAssignmentId !== null && $currentAssignment?->id !== (int) $expectedAssignmentId)
                || ($expectedAssignmentId === null && $currentAssignment?->project_id !== $expectedProjectId)) {
                throw ValidationException::withMessages([
                    'transfer' => [__('validation.transfer_assignment_changed')],
                ]);
            }

            $previousAssignment = null;
            if (($previous['project_assignment_id'] ?? null) !== null) {
                $previousAssignment = EquipmentProjectAssignment::query()
                    ->where('equipment_id', $equipment->id)
                    ->whereKey((int) $previous['project_assignment_id'])
                    ->lockForUpdate()
                    ->first();
            } elseif (($previous['project_id'] ?? null) !== null) {
                $previousAssignment = EquipmentProjectAssignment::query()
                    ->where('equipment_id', $equipment->id)
                    ->where('project_id', (int) $previous['project_id'])
                    ->whereNotNull('ended_at')
                    ->latest('ended_at')
                    ->latest('id')
                    ->lockForUpdate()
                    ->first();
            }

            $currentAssignment?->delete();
            $previousAssignment?->update(['ended_at' => null]);
            $equipment->update(['current_location_id' => $previous['location_id'] ?? null]);
            $change->delete();

            EquipmentChange::query()->create([
                'equipment_id' => $equipment->id,
                'actor_user_id' => $request->user()->id,
                'change_type' => EquipmentChangeType::ProjectAssignmentChanged,
                'source' => EquipmentChangeSource::Manual,
                'previous_values' => $next,
                'new_values' => $previous,
                'reason' => 'Transfer removed',
                'occurred_at' => now(),
            ]);
        });

        return $this->resource($equipment);
    }

    private function resource(Equipment $equipment): EquipmentResource
    {
        return new EquipmentResource($equipment->fresh()->load([
            'category', 'currentLocation.parent', 'currentLocation.project',
            'currentProjectAssignment.project:id,name', 'custodian', 'generatorDetails',
            'maintenances.technician', 'maintenances.createdBy', 'images.uploader', 'invoices.uploader',
            'vehicleDocuments.uploader',
            'insurancePolicies' => fn ($query) => $query
                ->where('insurance_type', 'equipment')
                ->with('documents')
                ->orderByDesc('ends_on'),
            'temporaryAdmissions' => fn ($query) => $query
                ->with('documents')
                ->latest('entered_on'),
            'changes' => fn ($query) => $query->with('actor')->latest('occurred_at')->latest('id'),
        ]));
    }
}
