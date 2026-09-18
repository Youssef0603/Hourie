<?php

namespace App\Actions\Equipment;

use App\Actions\Locations\ValidateLocationHierarchy;
use App\Enums\EquipmentChangeSource;
use App\Enums\EquipmentChangeType;
use App\Enums\EquipmentImportRowStatus;
use App\Enums\EquipmentImportStatus;
use App\Models\Equipment;
use App\Models\EquipmentCategory;
use App\Models\EquipmentChange;
use App\Models\EquipmentImport;
use App\Models\EquipmentImportRow;
use App\Models\EquipmentProjectAssignment;
use App\Models\GeneratorDetail;
use App\Models\Location;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ImportGeneratorInventory
{
    public function __construct(private ValidateLocationHierarchy $validateLocationHierarchy) {}

    /**
     * @param  array<int, array<string, string|null>>  $rows
     * @return array{rows: int, warnings: array<int, array<int, string>>, errors: array<int, string>}
     */
    public function inspect(array $rows): array
    {
        $seenAssetCodes = [];
        $warnings = [];
        $errors = [];
        $inventoryRows = 0;

        foreach ($rows as $rowNumber => $row) {
            $assetCode = $this->nullableString($row['B'] ?? null);

            if ($assetCode === null || ! is_numeric($row['A'] ?? null)) {
                continue;
            }

            $inventoryRows++;

            if (isset($seenAssetCodes[$assetCode])) {
                $errors[$rowNumber] = __('imports.errors.duplicate_asset_code', ['code' => $assetCode]);

                continue;
            }

            $seenAssetCodes[$assetCode] = true;

            if (Equipment::query()->where('asset_code', $assetCode)->exists()) {
                $errors[$rowNumber] = __('imports.errors.asset_code_exists', ['code' => $assetCode]);

                continue;
            }

            $rowWarnings = [];
            $this->normalize($row, $rowWarnings);

            if ($rowWarnings !== []) {
                $warnings[$rowNumber] = $rowWarnings;
            }
        }

        return [
            'rows' => $inventoryRows,
            'warnings' => $warnings,
            'errors' => $errors,
        ];
    }

    /**
     * @param  array<int, array<string, string|null>>  $rows
     */
    public function handle(
        string $originalFilename,
        string $fileHash,
        array $rows,
        ?User $actor = null,
    ): EquipmentImport {
        $inspection = $this->inspect($rows);

        if ($inspection['errors'] !== []) {
            throw ValidationException::withMessages([
                'file' => array_values($inspection['errors']),
            ]);
        }

        if (EquipmentImport::query()->where('file_sha256', $fileHash)->exists()) {
            throw ValidationException::withMessages([
                'file' => [__('imports.errors.already_imported')],
            ]);
        }

        $category = EquipmentCategory::query()->firstOrCreate(
            ['code' => 'generator'],
            ['name' => 'Générateurs', 'is_active' => true],
        );

        return DB::transaction(function () use (
            $actor,
            $category,
            $fileHash,
            $inspection,
            $originalFilename,
            $rows,
        ): EquipmentImport {
            $importedAt = now();
            $equipmentImport = EquipmentImport::query()->create([
                'imported_by_user_id' => $actor?->id,
                'original_filename' => $originalFilename,
                'file_sha256' => $fileHash,
                'status' => EquipmentImportStatus::Pending,
            ]);

            $importedRows = 0;

            foreach ($rows as $rowNumber => $row) {
                $assetCode = $this->nullableString($row['B'] ?? null);

                if ($assetCode === null || ! is_numeric($row['A'] ?? null)) {
                    continue;
                }

                $rowWarnings = [];
                $data = $this->normalize($row, $rowWarnings);
                [$project, $location] = $this->resolveProjectAndLocation(
                    $data['project_name'],
                    $data['location_name'],
                );

                $equipment = Equipment::query()->create([
                    'equipment_category_id' => $category->id,
                    'current_location_id' => $location?->id,
                    'custodian_employee_id' => null,
                    'asset_code' => $assetCode,
                    'brand' => $data['brand'],
                    'model' => $data['model'],
                    'serial_number' => $data['serial_number'],
                    'purchase_year' => $data['purchase_year'],
                    'condition' => $data['condition'],
                    'operational_situation' => null,
                    'observations' => $data['observations'],
                    'is_active' => true,
                ]);

                GeneratorDetail::query()->create([
                    'equipment_id' => $equipment->id,
                    'apparent_power_kva' => $data['apparent_power_kva'],
                    'active_power_kw' => $data['active_power_kw'],
                    'phases' => $data['phases'],
                    'voltage_rating' => $data['voltage_rating'],
                    'frequency_hz' => $data['frequency_hz'],
                    'current_rating' => $data['current_rating'],
                    'fuel_type' => $data['fuel_type'],
                    'tank_capacity_litres' => $data['tank_capacity_litres'],
                    'current_engine_hours' => $data['current_engine_hours'],
                ]);

                if ($project !== null) {
                    EquipmentProjectAssignment::query()->create([
                        'equipment_id' => $equipment->id,
                        'project_id' => $project->id,
                        'assigned_by_user_id' => $actor?->id,
                        'equipment_import_id' => $equipmentImport->id,
                        'assigned_at' => null,
                        'ended_at' => null,
                        'reason' => null,
                    ]);
                }

                $initialValues = [
                    'equipment' => $equipment->only([
                        'asset_code',
                        'brand',
                        'model',
                        'serial_number',
                        'purchase_year',
                        'condition',
                        'operational_situation',
                        'observations',
                    ]),
                    'project_id' => $project?->id,
                    'location_id' => $location?->id,
                    'generator_details' => $data['generator_details'],
                ];

                EquipmentChange::query()->create([
                    'equipment_id' => $equipment->id,
                    'actor_user_id' => $actor?->id,
                    'equipment_import_id' => $equipmentImport->id,
                    'change_type' => EquipmentChangeType::InitialImport,
                    'source' => EquipmentChangeSource::Import,
                    'previous_values' => null,
                    'new_values' => $initialValues,
                    'reason' => null,
                    'occurred_at' => $importedAt,
                ]);

                EquipmentImportRow::query()->create([
                    'equipment_import_id' => $equipmentImport->id,
                    'equipment_id' => $equipment->id,
                    'sheet_name' => 'Sheet1',
                    'row_number' => $rowNumber,
                    'source_asset_code' => $assetCode,
                    'status' => EquipmentImportRowStatus::Imported,
                    'raw_data' => $this->rawData($row),
                    'messages' => $rowWarnings === [] ? null : $rowWarnings,
                ]);

                $importedRows++;
            }

            $equipmentImport->update([
                'status' => EquipmentImportStatus::Completed,
                'imported_at' => $importedAt,
                'summary' => [
                    'imported_rows' => $importedRows,
                    'warning_rows' => count($inspection['warnings']),
                ],
            ]);

            return $equipmentImport->fresh();
        });
    }

    /**
     * @param  array<string, string|null>  $row
     * @param  array<int, string>  $warnings
     * @return array<string, mixed>
     */
    private function normalize(array $row, array &$warnings): array
    {
        $condition = match (mb_strtoupper(trim((string) ($row['Q'] ?? '')))) {
            'FONCTIONNE' => 'functional',
            'DEFFECT' => 'defective',
            '' => null,
            default => $this->warningValue($warnings, 'unknown_condition'),
        };

        if ($this->nullableString($row['R'] ?? null) !== null) {
            $warnings[] = 'operational_situation_not_imported';
        }

        $generatorDetails = [
            'apparent_power_kva' => $this->nullableDecimal($row['H'] ?? null, 'apparent_power_kva', $warnings),
            'active_power_kw' => $this->nullableDecimal($row['I'] ?? null, 'active_power_kw', $warnings),
            'phases' => $this->nullableString($row['J'] ?? null),
            'voltage_rating' => $this->nullableString($row['K'] ?? null),
            'frequency_hz' => $this->nullableDecimal($row['L'] ?? null, 'frequency_hz', $warnings),
            'current_rating' => $this->nullableString($row['M'] ?? null),
            'fuel_type' => $this->nullableString($row['N'] ?? null),
            'tank_capacity_litres' => $this->nullableDecimal($row['O'] ?? null, 'tank_capacity_litres', $warnings),
            'current_engine_hours' => $this->nullableDecimal($row['P'] ?? null, 'current_engine_hours', $warnings),
        ];

        return [
            'project_name' => $this->nullableString($row['C'] ?? null),
            'location_name' => $this->nullableString($row['D'] ?? null),
            'brand' => $this->nullableString($row['E'] ?? null),
            'model' => $this->nullableString($row['F'] ?? null),
            'serial_number' => $this->nullableString($row['G'] ?? null),
            'purchase_year' => $this->nullablePurchaseYear($row['S'] ?? null, $warnings),
            'condition' => $condition,
            'observations' => $this->nullableString($row['U'] ?? null),
            ...$generatorDetails,
            'generator_details' => $generatorDetails,
        ];
    }

    /**
     * @return array{0: Project|null, 1: Location|null}
     */
    private function resolveProjectAndLocation(?string $projectName, ?string $locationName): array
    {
        if ($projectName === null) {
            return [null, null];
        }

        $project = Project::query()->firstOrCreate(
            ['name' => $projectName],
            ['code' => null, 'is_active' => true],
        );
        $projectSite = Location::query()->firstOrCreate(
            ['project_id' => $project->id, 'parent_id' => null, 'name' => $projectName],
            ['location_type' => 'project_site', 'is_active' => true],
        );

        if ($locationName === null || $locationName === $projectName) {
            return [$project, $projectSite];
        }

        $this->validateLocationHierarchy->handle(null, $projectSite, $project->id);

        $location = Location::query()->firstOrCreate(
            ['project_id' => $project->id, 'parent_id' => $projectSite->id, 'name' => $locationName],
            ['location_type' => null, 'is_active' => true],
        );

        return [$project, $location];
    }

    /**
     * @param  array<int, string>  $warnings
     */
    private function nullableDecimal(?string $value, string $field, array &$warnings): ?float
    {
        $normalized = $this->nullableString($value);

        if ($normalized === null) {
            return null;
        }

        $normalized = str_replace(',', '.', $normalized);

        if (! is_numeric($normalized)) {
            $warnings[] = 'invalid_'.$field;

            return null;
        }

        return (float) $normalized;
    }

    /**
     * @param  array<int, string>  $warnings
     */
    private function nullablePurchaseYear(?string $value, array &$warnings): ?int
    {
        $normalized = $this->nullableString($value);

        if ($normalized === null) {
            return null;
        }

        if (! ctype_digit($normalized) || (int) $normalized < 1900 || (int) $normalized > (int) date('Y') + 1) {
            $warnings[] = 'invalid_purchase_year';

            return null;
        }

        return (int) $normalized;
    }

    private function nullableString(?string $value): ?string
    {
        $value = trim((string) $value);

        if ($value === '' || in_array(mb_strtoupper($value), ['N/A', 'N/S'], true)) {
            return null;
        }

        return $value;
    }

    /**
     * @param  array<int, string>  $warnings
     */
    private function warningValue(array &$warnings, string $warning): null
    {
        $warnings[] = $warning;

        return null;
    }

    /**
     * @param  array<string, string|null>  $row
     * @return array<string, string|null>
     */
    private function rawData(array $row): array
    {
        return [
            'source_number' => $row['A'] ?? null,
            'asset_code' => $row['B'] ?? null,
            'project_or_site' => $row['C'] ?? null,
            'location' => $row['D'] ?? null,
            'brand' => $row['E'] ?? null,
            'model' => $row['F'] ?? null,
            'serial_number' => $row['G'] ?? null,
            'apparent_power_kva' => $row['H'] ?? null,
            'active_power_kw' => $row['I'] ?? null,
            'phases' => $row['J'] ?? null,
            'voltage_rating' => $row['K'] ?? null,
            'frequency_hz' => $row['L'] ?? null,
            'current_rating' => $row['M'] ?? null,
            'fuel_type' => $row['N'] ?? null,
            'tank_capacity_litres' => $row['O'] ?? null,
            'current_engine_hours' => $row['P'] ?? null,
            'condition' => $row['Q'] ?? null,
            'operational_situation' => $row['R'] ?? null,
            'purchase_year' => $row['S'] ?? null,
            'responsible_person' => $row['T'] ?? null,
            'observations' => $row['U'] ?? null,
        ];
    }
}
