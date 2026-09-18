<?php

namespace App\Actions\Equipment;

use App\Enums\EquipmentChangeSource;
use App\Enums\EquipmentChangeType;
use App\Models\Equipment;
use App\Models\EquipmentChange;
use App\Models\EquipmentProjectAssignment;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class UpdateEquipment
{
    /** @param array<string, mixed> $data */
    public function handle(Equipment $equipment, array $data, User $actor): Equipment
    {
        return DB::transaction(function () use ($actor, $data, $equipment): Equipment {
            $equipment->loadMissing('generatorDetails', 'currentProjectAssignment.project', 'currentLocation');
            $previousValues = [
                'equipment' => $equipment->only([
                    'brand', 'model', 'serial_number', 'purchase_year', 'condition',
                    'operational_situation', 'current_location_id', 'custodian_employee_id', 'observations',
                ]),
                'project_id' => $equipment->currentProjectAssignment?->project_id,
                'generator_details' => $equipment->generatorDetails?->toArray(),
            ];
            $generatorDetails = $data['generator_details'];
            $hasProjectUpdate = array_key_exists('project_id', $data);
            $projectId = $data['project_id'] ?? null;
            unset($data['generator_details'], $data['project_id']);

            $equipment->update($data);

            if ($hasProjectUpdate && $equipment->currentProjectAssignment?->project_id !== $projectId) {
                $equipment->currentProjectAssignment?->update(['ended_at' => now()]);

                if ($projectId !== null) {
                    EquipmentProjectAssignment::query()->create([
                        'equipment_id' => $equipment->id,
                        'project_id' => $projectId,
                        'assigned_by_user_id' => $actor->id,
                    ]);
                }
            }
            $equipment->generatorDetails()->updateOrCreate(
                ['equipment_id' => $equipment->id],
                $generatorDetails,
            );

            $equipment->refresh()->load('generatorDetails', 'currentProjectAssignment.project', 'currentLocation');
            EquipmentChange::query()->create([
                'equipment_id' => $equipment->id,
                'actor_user_id' => $actor->id,
                'change_type' => EquipmentChangeType::SpecificationsUpdated,
                'source' => EquipmentChangeSource::Manual,
                'previous_values' => $previousValues,
                'new_values' => [
                    'equipment' => $equipment->only([
                        'brand', 'model', 'serial_number', 'purchase_year', 'condition',
                        'operational_situation', 'current_location_id', 'custodian_employee_id', 'observations',
                    ]),
                    'project_id' => $equipment->currentProjectAssignment?->project_id,
                    'generator_details' => $equipment->generatorDetails?->toArray(),
                ],
                'occurred_at' => now(),
            ]);

            return $equipment;
        });
    }
}
