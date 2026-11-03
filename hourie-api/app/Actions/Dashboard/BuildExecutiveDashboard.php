<?php

namespace App\Actions\Dashboard;

use App\Enums\EquipmentChangeSource;
use App\Enums\EquipmentChangeType;
use App\Enums\EquipmentCondition;
use App\Models\Bond;
use App\Models\Equipment;
use App\Models\EquipmentChange;
use App\Models\InsurancePolicy;
use App\Models\Project;
use App\Models\TemporaryAdmission;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

class BuildExecutiveDashboard
{
    private const ADMINISTRATIVE_HORIZON_DAYS = 90;

    private const MAINTENANCE_WARNING_HOURS = 50;

    private const LIST_LIMIT = 8;

    /** @return array<string, mixed> */
    public function handle(): array
    {
        $today = CarbonImmutable::today();
        $equipment = Equipment::query()
            ->where('is_active', true)
            ->with([
                'category:id,code,name',
                'currentProjectAssignment.project:id,name',
                'generatorDetails:equipment_id,current_engine_hours',
                'latestMaintenance',
            ])
            ->withCount(['invoices', 'vehicleDocuments', 'generatorDocuments'])
            ->get();

        $repairRequired = $equipment->filter(fn (Equipment $item): bool => in_array($item->condition, [
            EquipmentCondition::Defective->value,
            EquipmentCondition::OutOfService->value,
        ], true));
        $maintenanceByHours = $this->maintenanceByHours($equipment);
        $deadlines = $this->deadlines($today);
        $administrativeAttention = $deadlines->where('days_remaining', '<=', 30);
        $dataQuality = $this->dataQuality($equipment);
        $operationalEquipment = $equipment->filter(fn (Equipment $item): bool => in_array($item->condition, [
            EquipmentCondition::VeryGood->value,
            EquipmentCondition::Good->value,
        ], true))->count();
        $activeProjects = Project::query()->where('is_active', true)->where('status', 'active')->count();
        $trackedProjects = Project::query()->where('is_active', true)->count();

        return [
            'generated_at' => now()->toISOString(),
            'summary' => [
                'active_equipment' => $equipment->count(),
                'active_projects' => $activeProjects,
                'tracked_projects' => $trackedProjects,
                'operational_equipment' => $operationalEquipment,
                'availability_rate' => $equipment->isEmpty()
                    ? 0
                    : (int) round(($operationalEquipment / $equipment->count()) * 100),
                'attention_points' => $repairRequired->count() + $maintenanceByHours->count() + $administrativeAttention->count(),
            ],
            'priority_actions' => $this->priorityActions($repairRequired, $maintenanceByHours, $administrativeAttention),
            'deadlines' => $this->deadlineOverview($deadlines),
            'data_quality' => $dataQuality,
            'recent_activity' => $this->recentActivity(),
        ];
    }

    /** @param Collection<int, Equipment> $equipment @return Collection<int, array<string, mixed>> */
    private function maintenanceByHours(Collection $equipment): Collection
    {
        return $equipment->map(function (Equipment $item): ?array {
            $currentHours = $item->generatorDetails?->current_engine_hours;
            $targetHours = $item->latestMaintenance?->next_maintenance_engine_hours;

            if ($currentHours === null || $targetHours === null) {
                return null;
            }

            $remaining = round((float) $targetHours - (float) $currentHours, 2);

            return $remaining <= self::MAINTENANCE_WARNING_HOURS
                ? ['equipment' => $item, 'hours_remaining' => $remaining]
                : null;
        })->filter()->values();
    }

    /** @return Collection<int, array<string, mixed>> */
    private function deadlines(CarbonImmutable $today): Collection
    {
        $insurance = InsurancePolicy::query()
            ->whereNotNull('ends_on')
            ->whereDate('ends_on', '<=', $today->addDays(self::ADMINISTRATIVE_HORIZON_DAYS))
            ->get(['id', 'policy_number', 'ends_on'])
            ->map(fn (InsurancePolicy $policy): array => $this->deadline(
                'insurance',
                $policy->id,
                $policy->policy_number,
                $policy->ends_on,
                "/insurance/{$policy->id}",
                $today,
            ));

        $bonds = Bond::query()
            ->whereNotNull('expires_on')
            ->whereDate('expires_on', '<=', $today->addDays(self::ADMINISTRATIVE_HORIZON_DAYS))
            ->with('project:id,name')
            ->get(['id', 'project_id', 'bond_type', 'expires_on'])
            ->map(fn (Bond $bond): array => $this->deadline(
                'bond',
                $bond->id,
                ($bond->project?->name ?? 'Sans chantier').' · '.$bond->typeLabel(),
                $bond->expires_on,
                '/bonds',
                $today,
            ));

        $admissions = TemporaryAdmission::query()
            ->whereNotIn('status', ['returned', 'cleared'])
            ->with('documents:id,temporary_admission_id,document_type,document_date,validity_months')
            ->get(['id', 'customs_reference', 'entered_on', 'status'])
            ->map(function (TemporaryAdmission $admission) use ($today): ?array {
                $expiresOn = $admission->expiresOn();

                if ($expiresOn === null || $expiresOn->isAfter($today->addDays(self::ADMINISTRATIVE_HORIZON_DAYS))) {
                    return null;
                }

                return $this->deadline(
                    'temporary_admission',
                    $admission->id,
                    'AT '.$admission->customs_reference,
                    $expiresOn,
                    "/temporary-admissions/{$admission->id}",
                    $today,
                );
            })
            ->filter();

        return $insurance
            ->concat($bonds)
            ->concat($admissions)
            ->sort(function (array $left, array $right): int {
                $leftBucket = $left['days_remaining'] < 0 ? 0 : 1;
                $rightBucket = $right['days_remaining'] < 0 ? 0 : 1;

                if ($leftBucket !== $rightBucket) {
                    return $leftBucket <=> $rightBucket;
                }

                $leftUrgency = $left['days_remaining'] < 0 ? abs($left['days_remaining']) : $left['days_remaining'];
                $rightUrgency = $right['days_remaining'] < 0 ? abs($right['days_remaining']) : $right['days_remaining'];

                return $leftUrgency <=> $rightUrgency;
            })
            ->values();
    }

    /** @return array<string, mixed> */
    private function deadline(string $type, int $id, string $label, $date, string $path, CarbonImmutable $today): array
    {
        $dueOn = CarbonImmutable::parse($date);
        $daysRemaining = (int) $today->diffInDays($dueOn, false);

        return [
            'id' => $id,
            'type' => $type,
            'label' => trim($label, ' ·'),
            'due_on' => $dueOn->format('Y-m-d'),
            'days_remaining' => $daysRemaining,
            'severity' => $daysRemaining < 0 ? 'critical' : ($daysRemaining <= 30 ? 'warning' : 'info'),
            'path' => $path,
        ];
    }

    /** @param Collection<int, array<string, mixed>> $deadlines @return Collection<int, array<string, mixed>> */
    private function deadlineOverview(Collection $deadlines): Collection
    {
        return collect(['insurance', 'bond', 'temporary_admission'])
            ->flatMap(fn (string $type): Collection => $deadlines
                ->where('type', $type)
                ->take(2))
            ->take(self::LIST_LIMIT)
            ->values();
    }

    /**
     * @param  Collection<int, Equipment>  $repairRequired
     * @param  Collection<int, array<string, mixed>>  $maintenanceByHours
     * @param  Collection<int, array<string, mixed>>  $administrativeAttention
     * @return Collection<int, array<string, mixed>>
     */
    private function priorityActions(Collection $repairRequired, Collection $maintenanceByHours, Collection $administrativeAttention): Collection
    {
        $actions = collect();

        if ($repairRequired->isNotEmpty()) {
            $outOfService = $repairRequired->where('condition', EquipmentCondition::OutOfService->value)->count();
            $actions->push([
                'key' => 'repair',
                'title' => $repairRequired->count().' équipements à réparer',
                'description' => $outOfService > 0
                    ? $outOfService.' hors service et '.($repairRequired->count() - $outOfService).' défectueux'
                    : 'Équipements signalés comme défectueux',
                'severity' => 'critical',
                'path' => '/assets/all',
            ]);
        }

        if ($maintenanceByHours->isNotEmpty()) {
            $overdue = $maintenanceByHours->where('hours_remaining', '<=', 0)->count();
            $actions->push([
                'key' => 'maintenance',
                'title' => $maintenanceByHours->count().' maintenances à planifier',
                'description' => $overdue.' dépassée(s), '.($maintenanceByHours->count() - $overdue).' à moins de 50 heures',
                'severity' => $overdue > 0 ? 'critical' : 'warning',
                'path' => '/assets/generator',
            ]);
        }

        if ($administrativeAttention->isNotEmpty()) {
            $overdue = $administrativeAttention->where('days_remaining', '<', 0)->count();
            $actions->push([
                'key' => 'documents',
                'title' => $administrativeAttention->count().' échéances administratives',
                'description' => $overdue.' expirée(s), '.($administrativeAttention->count() - $overdue).' dans les 30 prochains jours',
                'severity' => $overdue > 0 ? 'critical' : 'warning',
                'path' => $administrativeAttention->first()['path'],
            ]);
        }

        return $actions;
    }

    /** @param Collection<int, Equipment> $equipment @return array<string, int> */
    private function dataQuality(Collection $equipment): array
    {
        $missingInvoices = $equipment->where('invoices_count', 0)->count();
        $missingSerials = $equipment->filter(fn (Equipment $item): bool => blank($item->serial_number))->count();
        $missingProjects = $equipment->filter(fn (Equipment $item): bool => $item->currentProjectAssignment === null)->count();
        $missingUsageStatus = $equipment->filter(fn (Equipment $item): bool => blank($item->usage_status))->count();
        $completeValues = $equipment->sum(function (Equipment $item): int {
            return collect([
                $item->brand,
                $item->model,
                $item->manufacture_year,
                $item->purchase_date,
                $item->supplier,
                $item->origin,
                $item->condition,
                $item->usage_status,
                $item->serial_number,
                $item->currentProjectAssignment?->project_id,
                ($item->invoices_count + $item->vehicle_documents_count + $item->generator_documents_count) > 0 ? true : null,
            ])->filter(fn ($value): bool => filled($value))->count();
        });
        $possibleValues = $equipment->count() * 11;

        return [
            'completeness_percent' => $possibleValues === 0 ? 100 : (int) round(($completeValues / $possibleValues) * 100),
            'missing_invoices' => $missingInvoices,
            'missing_serials' => $missingSerials,
            'missing_projects' => $missingProjects,
            'missing_usage_status' => $missingUsageStatus,
        ];
    }

    /** @return Collection<int, array<string, mixed>> */
    private function recentActivity(): Collection
    {
        return EquipmentChange::query()
            ->with(['equipment.category:id,code,name', 'actor:id,name'])
            ->whereHas('equipment', fn ($query) => $query->where('is_active', true))
            ->latest('occurred_at')
            ->latest('id')
            ->limit(8)
            ->get()
            ->map(function (EquipmentChange $change): array {
                $type = $change->change_type instanceof EquipmentChangeType
                    ? $change->change_type
                    : EquipmentChangeType::from($change->change_type);
                $source = $change->source instanceof EquipmentChangeSource
                    ? $change->source
                    : EquipmentChangeSource::from($change->source);
                $actorName = $change->actor?->name;

                return [
                    'id' => $change->id,
                    'type' => $type->value,
                    'title' => $this->activityTitle($type, $source),
                    'description' => trim($change->equipment->asset_code.' · '.collect([
                        $change->equipment->brand,
                        $change->equipment->model,
                    ])->filter()->join(' '), ' ·'),
                    'occurred_at' => $change->occurred_at?->toISOString(),
                    'initials' => $actorName === null ? 'SY' : $this->initials($actorName),
                    'path' => $this->assetPath($change->equipment),
                ];
            });
    }

    private function activityTitle(EquipmentChangeType $type, EquipmentChangeSource $source): string
    {
        return match ($type) {
            EquipmentChangeType::InitialImport => 'Nouvel actif ajouté',
            EquipmentChangeType::MaintenanceRecorded => 'Maintenance enregistrée',
            EquipmentChangeType::MaintenanceUpdated => 'Maintenance mise à jour',
            EquipmentChangeType::ProjectAssignmentChanged, EquipmentChangeType::LocationChanged => $source === EquipmentChangeSource::Transfer
                ? 'Transfert validé'
                : 'Affectation mise à jour',
            EquipmentChangeType::ConditionChanged => 'État de l’actif mis à jour',
            EquipmentChangeType::InvoiceAdded, EquipmentChangeType::VehicleDocumentAdded, EquipmentChangeType::GeneratorDocumentAdded => 'Document ajouté',
            default => 'Fiche équipement mise à jour',
        };
    }

    private function initials(string $name): string
    {
        return collect(preg_split('/\s+/', trim($name)) ?: [])
            ->filter()
            ->take(2)
            ->map(fn (string $part): string => mb_strtoupper(mb_substr($part, 0, 1)))
            ->join('');
    }

    private function assetPath(Equipment $equipment): string
    {
        $code = $equipment->category?->code ?? 'all';

        return $code === 'generator'
            ? "/assets/generator/{$equipment->id}"
            : "/assets/{$code}/{$equipment->id}";
    }
}
