<?php

namespace App\Http\Controllers\Api\V1\Equipment;

use App\Enums\EquipmentChangeSource;
use App\Enums\EquipmentChangeType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Equipment\StoreEquipmentMaintenanceRequest;
use App\Http\Requests\Equipment\UpdateEquipmentMaintenanceRequest;
use App\Http\Resources\Equipment\EquipmentMaintenanceResource;
use App\Models\Equipment;
use App\Models\EquipmentChange;
use App\Models\EquipmentMaintenance;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class EquipmentMaintenanceController extends Controller
{
    public function store(
        StoreEquipmentMaintenanceRequest $request,
        Equipment $equipment,
    ): EquipmentMaintenanceResource {
        $maintenance = DB::transaction(function () use ($equipment, $request): EquipmentMaintenance {
            $data = $this->withCompanyCurrency($request->validated());
            $maintenance = $equipment->maintenances()->create([
                ...$data,
                'created_by_user_id' => $request->user()->id,
            ]);

            $this->recordChange($equipment, $request->user()->id, EquipmentChangeType::MaintenanceRecorded, null, $maintenance->toArray());

            return $maintenance;
        });

        return new EquipmentMaintenanceResource($maintenance->load(['technician', 'createdBy']));
    }

    public function update(
        UpdateEquipmentMaintenanceRequest $request,
        Equipment $equipment,
        EquipmentMaintenance $maintenance,
    ): EquipmentMaintenanceResource {
        $this->ensureBelongsToEquipment($equipment, $maintenance);

        DB::transaction(function () use ($equipment, $maintenance, $request): void {
            $previousValues = $maintenance->toArray();
            $maintenance->update($this->withCompanyCurrency($request->validated()));
            $this->recordChange($equipment, $request->user()->id, EquipmentChangeType::MaintenanceUpdated, $previousValues, $maintenance->fresh()->toArray());
        });

        return new EquipmentMaintenanceResource($maintenance->fresh()->load(['technician', 'createdBy']));
    }

    public function destroy(Equipment $equipment, EquipmentMaintenance $maintenance): Response
    {
        $this->ensureBelongsToEquipment($equipment, $maintenance);
        Gate::authorize('delete', $maintenance);

        DB::transaction(function () use ($equipment, $maintenance): void {
            $previousValues = $maintenance->toArray();
            $maintenance->delete();
            $this->recordChange($equipment, auth()->id(), EquipmentChangeType::MaintenanceDeleted, $previousValues, ['deleted' => true]);
        });

        return response()->noContent();
    }

    private function ensureBelongsToEquipment(Equipment $equipment, EquipmentMaintenance $maintenance): void
    {
        abort_unless($maintenance->equipment_id === $equipment->id, 404);
    }

    /** @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    private function withCompanyCurrency(array $data): array
    {
        $data['cost_currency'] = isset($data['cost']) ? 'XOF' : null;
        $data['oil_quantity_litres'] = ($data['oil_changed'] ?? null) === true
            ? ($data['oil_quantity_litres'] ?? null)
            : null;

        return $data;
    }

    /** @param array<string, mixed>|null $previousValues
     * @param  array<string, mixed>  $newValues
     */
    private function recordChange(
        Equipment $equipment,
        ?int $actorUserId,
        EquipmentChangeType $changeType,
        ?array $previousValues,
        array $newValues,
    ): void {
        EquipmentChange::query()->create([
            'equipment_id' => $equipment->id,
            'actor_user_id' => $actorUserId,
            'change_type' => $changeType,
            'source' => EquipmentChangeSource::Maintenance,
            'previous_values' => $previousValues,
            'new_values' => $newValues,
            'occurred_at' => now(),
        ]);
    }
}
