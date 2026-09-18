<?php

namespace App\Actions\Equipment;

use App\Enums\EquipmentChangeSource;
use App\Enums\EquipmentChangeType;
use App\Models\Equipment;
use App\Models\EquipmentChange;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class UpdateEquipment
{
    /** @param array<string, mixed> $data */
    public function handle(Equipment $equipment, array $data, User $actor): Equipment
    {
        return DB::transaction(function () use ($actor, $data, $equipment): Equipment {
            $equipment->loadMissing('generatorDetails');
            $previousValues = [
                'equipment' => $equipment->only([
                    'brand', 'model', 'serial_number', 'purchase_year', 'condition',
                    'operational_situation', 'custodian_employee_id', 'observations',
                ]),
                'generator_details' => $equipment->generatorDetails?->toArray(),
            ];
            $generatorDetails = $data['generator_details'];
            unset($data['generator_details']);

            $equipment->update($data);
            $equipment->generatorDetails()->updateOrCreate(
                ['equipment_id' => $equipment->id],
                $generatorDetails,
            );

            $equipment->refresh()->load('generatorDetails');
            EquipmentChange::query()->create([
                'equipment_id' => $equipment->id,
                'actor_user_id' => $actor->id,
                'change_type' => EquipmentChangeType::SpecificationsUpdated,
                'source' => EquipmentChangeSource::Manual,
                'previous_values' => $previousValues,
                'new_values' => [
                    'equipment' => $equipment->only([
                        'brand', 'model', 'serial_number', 'purchase_year', 'condition',
                        'operational_situation', 'custodian_employee_id', 'observations',
                    ]),
                    'generator_details' => $equipment->generatorDetails?->toArray(),
                ],
                'occurred_at' => now(),
            ]);

            return $equipment;
        });
    }
}
