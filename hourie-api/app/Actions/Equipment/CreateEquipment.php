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

class CreateEquipment
{
    /** @param array<string, mixed> $data */
    public function handle(array $data, User $actor): Equipment
    {
        return DB::transaction(function () use ($actor, $data): Equipment {
            $categoryCode = $data['category_code'] ?? 'generator';
            $definition = EquipmentCategory::ASSET_CATEGORIES[$categoryCode];
            $category = EquipmentCategory::query()->firstOrCreate(
                ['code' => $categoryCode],
                ['name' => $definition['name'], 'is_active' => true],
            );

            $generatorDetails = $data['generator_details'] ?? null;
            $projectId = $data['project_id'] ?? null;
            $requestedAssetCode = $data['asset_code'] ?? null;
            unset($data['category_code'], $data['generator_details'], $data['project_id'], $data['asset_code']);

            $equipment = Equipment::query()->create([
                ...$data,
                'equipment_category_id' => $category->id,
                'asset_code' => 'pending-'.Str::uuid(),
                'is_active' => true,
            ]);
            $equipment->update([
                'asset_code' => $requestedAssetCode ?: $definition['prefix'].'-'.str_pad((string) $equipment->id, 3, '0', STR_PAD_LEFT),
            ]);
            if ($generatorDetails !== null) {
                $equipment->generatorDetails()->create($generatorDetails);
            }

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
                    'asset_details' => $equipment->asset_details,
                    'project_id' => $projectId,
                ],
                'occurred_at' => now(),
            ]);

            return $equipment->fresh();
        });
    }
}
