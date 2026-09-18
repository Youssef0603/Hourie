<?php

namespace App\Actions\Equipment;

use App\Enums\EquipmentChangeSource;
use App\Enums\EquipmentChangeType;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\EquipmentChange;
use App\Models\EquipmentProjectAssignment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use RuntimeException;

class CreateEquipment
{
    /** @param array<string, mixed> $data */
    public function handle(array $data, User $actor): Equipment
    {
        return DB::transaction(function () use ($actor, $data): Equipment {
            $category = EquipmentCategory::query()->where('code', 'generator')->first();

            if ($category === null) {
                throw new RuntimeException('The generator category is missing.');
            }

            $generatorDetails = $data['generator_details'];
            $projectId = $data['project_id'] ?? null;
            $requestedAssetCode = $data['asset_code'] ?? null;
            unset($data['generator_details'], $data['project_id'], $data['asset_code']);

            $equipment = Equipment::query()->create([
                ...$data,
                'equipment_category_id' => $category->id,
                'asset_code' => 'pending-'.Str::uuid(),
                'is_active' => true,
            ]);
            $equipment->update([
                'asset_code' => $requestedAssetCode ?: 'GEN-'.str_pad((string) $equipment->id, 3, '0', STR_PAD_LEFT),
            ]);
            $equipment->generatorDetails()->create($generatorDetails);

            if ($projectId !== null) {
                EquipmentProjectAssignment::query()->create([
                    'equipment_id' => $equipment->id,
                    'project_id' => $projectId,
                    'assigned_by_user_id' => $actor->id,
                ]);
            }

            EquipmentChange::query()->create([
                'equipment_id' => $equipment->id,
                'actor_user_id' => $actor->id,
                'change_type' => EquipmentChangeType::IdentityUpdated,
                'source' => EquipmentChangeSource::Manual,
                'new_values' => [
                    'equipment' => $equipment->fresh()->toArray(),
                    'generator_details' => $equipment->generatorDetails()->first()?->toArray(),
                    'project_id' => $projectId,
                ],
                'occurred_at' => now(),
            ]);

            return $equipment->fresh();
        });
    }
}
