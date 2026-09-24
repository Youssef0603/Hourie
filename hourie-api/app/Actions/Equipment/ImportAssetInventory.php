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
use App\Models\GeneratorDetail;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ImportAssetInventory
{
    public const SHEET_NAME = 'CI equipment (3)';

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
            $categories = [];

            foreach ($rows as $rowNumber => $row) {
                if (! $this->isInventoryRow($rowNumber, $row)) {
                    continue;
                }

                $data = $this->normalize($row);
                $categories[$data['category_code']] = ($categories[$data['category_code']] ?? 0) + 1;
                $existing = $data['serial_number'] === null ? null : Equipment::query()
                    ->whereRaw('lower(serial_number) = ?', [mb_strtolower($data['serial_number'])])
                    ->first();

                if ($existing !== null) {
                    $this->recordRow($import, $rowNumber, $row, $data['source_code'], EquipmentImportRowStatus::Skipped, $existing, ['duplicate_existing_asset']);
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

                if ($data['generator_details'] !== null) {
                    GeneratorDetail::query()->create(['equipment_id' => $equipment->id, ...$data['generator_details']]);
                }

                EquipmentChange::query()->create([
                    'equipment_id' => $equipment->id,
                    'actor_user_id' => $actor?->id,
                    'equipment_import_id' => $import->id,
                    'change_type' => EquipmentChangeType::InitialImport,
                    'source' => EquipmentChangeSource::Import,
                    'new_values' => ['equipment' => $equipment->fresh()->toArray(), 'source_code' => $data['source_code']],
                    'occurred_at' => $importedAt,
                ]);
                $this->recordRow($import, $rowNumber, $row, $data['source_code'], EquipmentImportRowStatus::Imported, $equipment);
                $imported++;
            }

            $import->update(['status' => EquipmentImportStatus::Completed, 'imported_at' => $importedAt, 'summary' => [
                'imported_rows' => $imported,
                'skipped_rows' => $skipped,
                'categories' => $categories,
            ]]);

            return $import->fresh();
        });
    }

    /** @param array<string, string|null> $row */
    private function isInventoryRow(int $rowNumber, array $row): bool
    {
        return $rowNumber > 5 && $this->text($row['D'] ?? null) !== null && $this->text($row['E'] ?? null) !== null;
    }

    /** @param array<string, string|null> $row @return array<string, mixed> */
    private function normalize(array $row): array
    {
        $type = $this->text($row['E'] ?? null);
        $typeLower = mb_strtolower((string) $type);
        $categoryCode = match (true) {
            $typeLower === 'generator' => 'generator',
            $this->text($row['B'] ?? null) === 'Formwork' => 'formwork_scaffolding',
            in_array($typeLower, ['car', 'utility car'], true) => 'car',
            in_array($typeLower, ['hauler', 'road tractor', 'trailor', 'trailer', 'crane truck'], true) => 'truck_dumper',
            default => 'equipment',
        };
        $sourceCode = $this->text($row['D'] ?? null) ?? 'SOURCE';
        $commonDetails = [
            'counter_at_purchase' => $this->text($row['R'] ?? null),
            'purchase_price' => $this->text($row['S'] ?? null),
            'shipping_cost' => $this->text($row['T'] ?? null),
            'official_document_type' => $this->text($row['L'] ?? null),
            'official_document_location' => $this->text($row['M'] ?? null),
        ];
        $assetDetails = match ($categoryCode) {
            'car' => [...$commonDetails, 'fuel_type' => null, 'odometer_km' => null],
            'truck_dumper' => [...$commonDetails, 'vehicle_type' => $type, 'payload_tonnes' => null, 'fuel_type' => null, 'odometer_km' => null],
            'formwork_scaffolding' => [...$commonDetails, 'system_type' => $type, 'quantity' => $this->numberFromText($row['J'] ?? null), 'unit' => $this->unit($row['J'] ?? null), 'sub_category' => $this->text($row['C'] ?? null)],
            'generator' => null,
            default => [...$commonDetails, 'equipment_type' => $type, 'sub_category' => $this->text($row['C'] ?? null), 'capacity' => null, 'power_source' => null],
        };

        return [
            'category_code' => $categoryCode,
            'source_code' => $sourceCode,
            'brand' => $this->text($row['F'] ?? null),
            'model' => $this->text($row['H'] ?? null),
            'serial_number' => $this->text($row['J'] ?? null),
            'manufacture_year' => $this->year($row['I'] ?? null),
            'purchase_date' => $this->date($row['Q'] ?? null),
            'condition' => $this->condition($row['O'] ?? null),
            'asset_details' => $assetDetails,
            'generator_details' => $categoryCode === 'generator' ? ['apparent_power_kva' => $this->kva($row['H'] ?? null)] : null,
            'observations' => 'Code source : '.$sourceCode.($this->text($row['N'] ?? null) === null ? '' : "\nLocalisation source : ".$this->text($row['N'])),
        ];
    }

    /** @param array<string, string|null> $row @param array<int, string>|null $messages */
    private function recordRow(EquipmentImport $import, int $rowNumber, array $row, string $sourceCode, EquipmentImportRowStatus $status, Equipment $equipment, ?array $messages = null): void
    {
        EquipmentImportRow::query()->create([
            'equipment_import_id' => $import->id,
            'equipment_id' => $equipment->id,
            'sheet_name' => self::SHEET_NAME,
            'row_number' => $rowNumber,
            'source_asset_code' => $sourceCode,
            'status' => $status,
            'raw_data' => $row,
            'messages' => $messages,
        ]);
    }

    private function text(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' || $value === '…..' ? null : $value;
    }

    private function year(?string $value): ?int
    {
        $value = $this->text($value);

        return $value !== null && ctype_digit($value) && (int) $value >= 1900 && (int) $value <= (int) date('Y') + 1 ? (int) $value : null;
    }

    private function date(?string $value): ?string
    {
        $value = $this->text($value);
        if ($value === null) {
            return null;
        }
        if (preg_match('/^\d{2}-\d{2}-\d{4}$/', $value) === 1) {
            return \DateTimeImmutable::createFromFormat('!d-m-Y', $value)?->format('Y-m-d');
        }

        return ctype_digit($value) && (int) $value > 20000 && (int) $value < 60000 ? (new \DateTimeImmutable('1899-12-30'))->modify("+{$value} days")->format('Y-m-d') : null;
    }

    private function number(?string $value): ?float
    {
        $value = str_replace([',', ' '], ['.', ''], (string) $value);

        return is_numeric($value) ? (float) $value : null;
    }

    private function kva(?string $value): ?float
    {
        return preg_match('/(\d+(?:[,.]\d+)?)\s*KVA/i', (string) $value, $matches) === 1 ? $this->number($matches[1]) : null;
    }

    private function numberFromText(?string $value): ?float
    {
        return preg_match('/(\d+(?:[,.]\d+)?)/', (string) $value, $matches) === 1 ? $this->number($matches[1]) : null;
    }

    private function unit(?string $value): ?string
    {
        return preg_match('/\d+(?:[,.]\d+)?\s*(.+)$/', (string) $value, $matches) === 1 ? trim($matches[1]) : null;
    }

    private function condition(?string $value): ?string
    {
        return mb_strtolower((string) $this->text($value)) === 'very good' ? 'very_good' : null;
    }
}
