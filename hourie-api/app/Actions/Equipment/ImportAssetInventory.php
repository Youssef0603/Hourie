<?php

namespace App\Actions\Equipment;

use App\Enums\EquipmentChangeSource;
use App\Enums\EquipmentChangeType;
use App\Enums\EquipmentImportRowStatus;
use App\Enums\EquipmentImportStatus;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\EquipmentChange;
use App\Models\EquipmentImport;
use App\Models\EquipmentImportRow;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportAssetInventory
{
    public const SHEET_NAME = 'CI equipment (3)';

    public function __construct(private AssetInventoryRowMapper $rowMapper) {}

    /** @param array<int, array<string, string|null>> $rows */
    public function handle(string $filename, string $fileHash, array $rows, ?User $actor = null): EquipmentImport
    {
        return DB::transaction(function () use ($actor, $fileHash, $filename, $rows): EquipmentImport {
            $importedAt = now();
            $import = EquipmentImport::query()->create([
                'imported_by_user_id' => $actor?->id,
                'original_filename' => $filename,
                'file_sha256' => $fileHash,
                'status' => EquipmentImportStatus::Pending,
            ]);
            $imported = 0;
            $skipped = 0;
            $skippedGenerators = 0;
            $categories = [];

            foreach ($rows as $rowNumber => $row) {
                if (! $this->rowMapper->isInventoryRow($rowNumber, $row)) {
                    continue;
                }

                $data = $this->rowMapper->map($row);
                $categories[$data['category_code']] = ($categories[$data['category_code']] ?? 0) + 1;

                if ($data['category_code'] === 'generator') {
                    $this->recordRow($import, $rowNumber, $row, null, EquipmentImportRowStatus::Skipped, null, ['generator_rows_must_be_imported_from_groupes']);
                    $skipped++;
                    $skippedGenerators++;

                    continue;
                }

                $existing = $data['serial_number'] === null ? null : Equipment::query()
                    ->whereRaw('lower(serial_number) = ?', [mb_strtolower($data['serial_number'])])
                    ->first();

                if ($existing !== null) {
                    $this->recordRow($import, $rowNumber, $row, null, EquipmentImportRowStatus::Skipped, $existing, ['duplicate_existing_asset']);
                    $skipped++;

                    continue;
                }

                $definition = EquipmentCategory::ASSET_CATEGORIES[$data['category_code']];
                $category = EquipmentCategory::query()->firstOrCreate(
                    ['code' => $data['category_code']],
                    ['name' => $definition['name'], 'is_active' => true],
                );
                $equipment = Equipment::query()->create([
                    'equipment_category_id' => $category->id,
                    'asset_code' => 'pending-'.Str::uuid(),
                    'brand' => $data['brand'],
                    'model' => $data['model'],
                    'serial_number' => $data['serial_number'],
                    'manufacture_year' => $data['manufacture_year'],
                    'purchase_date' => $data['purchase_date'],
                    'condition' => $data['condition'],
                    'asset_details' => $data['asset_details'],
                    'observations' => $data['observations'],
                    'is_active' => true,
                ]);
                $equipment->update(['asset_code' => EquipmentCategory::assetCode($data['category_code'], $equipment->id)]);

                EquipmentChange::query()->create([
                    'equipment_id' => $equipment->id,
                    'actor_user_id' => $actor?->id,
                    'equipment_import_id' => $import->id,
                    'change_type' => EquipmentChangeType::InitialImport,
                    'source' => EquipmentChangeSource::Import,
                    'new_values' => ['equipment' => $equipment->fresh()->toArray()],
                    'occurred_at' => $importedAt,
                ]);
                $this->recordRow($import, $rowNumber, $row, null, EquipmentImportRowStatus::Imported, $equipment);
                $imported++;
            }

            $import->update(['status' => EquipmentImportStatus::Completed, 'imported_at' => $importedAt, 'summary' => [
                'imported_rows' => $imported,
                'skipped_rows' => $skipped,
                'skipped_generator_rows' => $skippedGenerators,
                'warning_rows' => 0,
                'categories' => $categories,
            ]]);

            return $import->fresh();
        });
    }

    /** @param array<string, string|null> $row @param array<int, string>|null $messages */
    private function recordRow(EquipmentImport $import, int $rowNumber, array $row, ?string $sourceCode, EquipmentImportRowStatus $status, ?Equipment $equipment, ?array $messages = null): void
    {
        unset($row['D']);

        EquipmentImportRow::query()->create([
            'equipment_import_id' => $import->id,
            'equipment_id' => $equipment?->id,
            'sheet_name' => self::SHEET_NAME,
            'row_number' => $rowNumber,
            'source_asset_code' => $sourceCode,
            'status' => $status,
            'raw_data' => $row,
            'messages' => $messages,
        ]);
    }
}
