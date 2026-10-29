<?php

namespace App\Actions\Dashboard;

use App\Enums\EquipmentChangeType;
use App\Enums\EquipmentCondition;
use App\Models\Equipment;
use App\Models\EquipmentChange;
use Illuminate\Support\Collection;

class BuildExecutiveDashboard
{
    private const LIST_LIMIT = 8;

    private const MAINTENANCE_WARNING_HOURS = 50;

    /** @return array<string, mixed> */
    public function handle(): array
    {
        $equipment = Equipment::query()
            ->where('is_active', true)
            ->with([
                'category:id,code,name',
                'currentLocation:id,name',
                'currentProjectAssignment.project:id,name',
                'generatorDetails:equipment_id,current_engine_hours',
                'latestMaintenance',
            ])
            ->withCount(['invoices', 'vehicleDocuments', 'generatorDocuments'])
            ->orderBy('asset_code')
            ->get();

        $repairRequired = $equipment->filter(fn (Equipment $item): bool => in_array($item->condition, [
            EquipmentCondition::Defective->value,
            EquipmentCondition::OutOfService->value,
        ], true))->map(fn (Equipment $item): array => $this->assetItem($item, [
            $item->condition === EquipmentCondition::OutOfService->value ? 'Hors service' : 'Défectueux',
        ], 'critical'));

        $unknownLocation = $equipment->filter(fn (Equipment $item): bool => $item->current_location_id === null)
            ->map(fn (Equipment $item): array => $this->assetItem($item, ['Localisation physique inconnue'], 'warning'));

        $missingIdentityOrDocuments = $equipment->map(function (Equipment $item): ?array {
            $issues = collect();
            if (blank($item->serial_number)) {
                $issues->push('Numéro de série manquant');
            }
            if (($item->invoices_count + $item->vehicle_documents_count + $item->generator_documents_count) === 0) {
                $issues->push('Aucun document');
            }

            return $issues->isEmpty() ? null : $this->assetItem($item, $issues->all(), 'warning');
        })->filter();

        $maintenanceByHours = $equipment->map(function (Equipment $item): ?array {
            $currentHours = $item->generatorDetails?->current_engine_hours;
            $targetHours = $item->latestMaintenance?->next_maintenance_engine_hours;
            if ($currentHours === null || $targetHours === null) {
                return null;
            }

            $remaining = round((float) $targetHours - (float) $currentHours, 2);
            if ($remaining > self::MAINTENANCE_WARNING_HOURS) {
                return null;
            }

            return [
                ...$this->assetItem(
                    $item,
                    [$remaining <= 0 ? 'Entretien dépassé' : 'Entretien proche'],
                    $remaining <= 0 ? 'critical' : 'warning',
                ),
                'current_engine_hours' => (float) $currentHours,
                'next_maintenance_engine_hours' => (float) $targetHours,
                'hours_remaining' => $remaining,
            ];
        })->filter()->sortBy('hours_remaining');

        $incompleteRecords = $equipment->map(function (Equipment $item): ?array {
            $fields = [
                'brand' => 'Marque',
                'model' => 'Modèle',
                'manufacture_year' => 'Année de fabrication',
                'purchase_date' => 'Date d’achat',
                'supplier' => 'Fournisseur',
                'origin' => 'Origine',
                'condition' => 'État',
                'usage_status' => 'Utilisation actuelle',
            ];
            $issues = collect($fields)
                ->filter(fn (string $label, string $field): bool => blank($item->{$field}))
                ->values()
                ->map(fn (string $label): string => $label.' à compléter')
                ->all();

            return $issues === [] ? null : $this->assetItem($item, $issues, 'info');
        })->filter();

        $recentTransfers = $this->recentTransfers();

        return [
            'generated_at' => now()->toISOString(),
            'sections' => [
                'repair_required' => $this->section($repairRequired),
                'unknown_location' => $this->section($unknownLocation),
                'missing_identity_or_documents' => $this->section($missingIdentityOrDocuments),
                'maintenance_by_hours' => $this->section($maintenanceByHours),
                'recent_transfers' => $this->section($recentTransfers),
                'incomplete_records' => $this->section($incompleteRecords),
            ],
        ];
    }

    /** @return Collection<int, array<string, mixed>> */
    private function recentTransfers(): Collection
    {
        return EquipmentChange::query()
            ->whereIn('change_type', [
                EquipmentChangeType::LocationChanged->value,
                EquipmentChangeType::ProjectAssignmentChanged->value,
            ])
            ->where('occurred_at', '>=', now()->subDays(30))
            ->with(['equipment.category:id,code,name', 'equipment.currentLocation:id,name', 'equipment.currentProjectAssignment.project:id,name'])
            ->latest('occurred_at')
            ->get()
            ->filter(fn (EquipmentChange $change): bool => $change->equipment?->is_active === true)
            ->unique('equipment_id')
            ->map(function (EquipmentChange $change): array {
                $previous = $change->previous_values ?? [];
                $current = $change->new_values ?? [];

                return [
                    ...$this->assetItem($change->equipment, ['Affectation mise à jour'], 'info'),
                    'occurred_at' => $change->occurred_at?->toISOString(),
                    'from' => $previous['project'] ?? $previous['location'] ?? null,
                    'to' => $current['project'] ?? $current['location'] ?? null,
                ];
            })
            ->values();
    }

    /** @param array<int, string> $issues @return array<string, mixed> */
    private function assetItem(Equipment $equipment, array $issues, string $severity): array
    {
        $label = trim(collect([$equipment->brand, $equipment->model])->filter()->join(' '));

        return [
            'id' => $equipment->id,
            'asset_code' => $equipment->asset_code,
            'label' => $label !== '' ? $label : $equipment->asset_code,
            'category_code' => $equipment->category?->code,
            'category_name' => $equipment->category?->name,
            'serial_number' => $equipment->serial_number,
            'location_name' => $equipment->currentLocation?->name,
            'project_name' => $equipment->currentProjectAssignment?->project?->name,
            'issues' => $issues,
            'severity' => $severity,
            'path' => $this->assetPath($equipment),
        ];
    }

    private function assetPath(Equipment $equipment): string
    {
        $code = $equipment->category?->code ?? 'all';

        return $code === 'generator'
            ? "/assets/generator/{$equipment->id}"
            : "/assets/{$code}/{$equipment->id}";
    }

    /** @param Collection<int, array<string, mixed>> $items @return array<string, mixed> */
    private function section(Collection $items): array
    {
        return ['total' => $items->count(), 'items' => $items->take(self::LIST_LIMIT)->values()];
    }
}
