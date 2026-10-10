<?php

namespace App\Actions\Dashboard;

use App\Actions\Equipment\ListMaintenanceWarnings;
use App\Models\Bond;
use App\Models\Employee;
use App\Models\Equipment;
use App\Models\InsurancePolicy;
use App\Models\Project;
use App\Models\TemporaryAdmission;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class BuildExecutiveDashboard
{
    public function __construct(private readonly ListMaintenanceWarnings $maintenanceWarnings) {}

    /** @return array<string, mixed> */
    public function handle(): array
    {
        $today = CarbonImmutable::today();
        $activeEquipment = Equipment::query()->where('is_active', true);
        $assignedEquipment = (clone $activeEquipment)->whereHas('currentProjectAssignment')->count();
        $maintenanceSummary = $this->maintenanceWarnings->handle(1)['summary'];
        $deadlines = $this->deadlines($today);
        $expiredDeadlineCount = $deadlines->where('days_remaining', '<', 0)->count();
        $upcomingDeadlineCount = $deadlines
            ->where('days_remaining', '>=', 0)
            ->where('days_remaining', '<=', 30)
            ->count();
        $dataQuality = $this->dataQuality((clone $activeEquipment));

        return [
            'generated_at' => now()->toISOString(),
            'summary' => [
                'active_sites' => Project::query()->where('is_active', true)->count(),
                'active_equipment' => (clone $activeEquipment)->count(),
                'assigned_equipment' => $assignedEquipment,
                'unassigned_equipment' => (clone $activeEquipment)->whereDoesntHave('currentProjectAssignment')->count(),
                'maintenance_alerts' => $maintenanceSummary['total'],
                'critical_alerts' => $expiredDeadlineCount + $maintenanceSummary['overdue'],
                'upcoming_deadlines' => $upcomingDeadlineCount,
                'active_people' => Employee::query()->where('is_active', true)->count(),
            ],
            'urgent_actions' => $this->urgentActions($deadlines, $maintenanceSummary, $dataQuality),
            'deadlines' => $deadlines->take(8)->values(),
            'equipment_status' => $this->equipmentStatus((clone $activeEquipment), $assignedEquipment),
            'equipment_categories' => $this->equipmentCategories(),
            'project_health' => $this->projectHealth($today),
        ];
    }

    /** @return Collection<int, array<string, mixed>> */
    private function deadlines(CarbonImmutable $today): Collection
    {
        $insurance = InsurancePolicy::query()
            ->whereNotNull('ends_on')
            ->whereDate('ends_on', '<=', $today->addDays(90))
            ->get(['id', 'policy_number', 'ends_on'])
            ->map(fn (InsurancePolicy $policy) => $this->deadline('insurance', $policy->id, 'Assurance '.$policy->policy_number, $policy->ends_on, "/insurance/{$policy->id}", $today));

        $bonds = Bond::query()
            ->whereNotNull('expires_on')
            ->whereDate('expires_on', '<=', $today->addDays(90))
            ->with('project:id,name')
            ->get(['id', 'project_id', 'bond_type', 'expires_on'])
            ->map(fn (Bond $bond) => $this->deadline('bond', $bond->id, 'Caution · '.($bond->project?->name ?? $bond->typeLabel()), $bond->expires_on, '/bonds', $today));

        $admissions = TemporaryAdmission::query()
            ->whereNotIn('status', ['returned', 'cleared'])
            ->with('documents:id,temporary_admission_id,document_type')
            ->get(['id', 'customs_reference', 'entered_on', 'status'])
            ->map(fn (TemporaryAdmission $admission) => $this->deadline('temporary_admission', $admission->id, 'AT '.$admission->customs_reference, $admission->expiresOn(), "/temporary-admissions/{$admission->id}", $today))
            ->filter(fn (array $deadline) => $deadline['days_remaining'] <= 90);

        return $insurance->concat($bonds)->concat($admissions)
            ->sortBy('days_remaining')
            ->values();
    }

    /** @return array<string, mixed> */
    private function deadline(string $type, int $id, string $label, $date, string $path, CarbonImmutable $today): array
    {
        $dueOn = CarbonImmutable::parse($date);
        $days = (int) $today->diffInDays($dueOn, false);

        return [
            'id' => $id,
            'type' => $type,
            'label' => $label,
            'due_on' => $dueOn->format('Y-m-d'),
            'days_remaining' => $days,
            'severity' => $days < 0 ? 'critical' : ($days <= 30 ? 'warning' : 'info'),
            'path' => $path,
        ];
    }

    /** @param array<string, int> $maintenanceSummary @param array<string, int> $dataQuality @return Collection<int, array<string, mixed>> */
    private function urgentActions(Collection $deadlines, array $maintenanceSummary, array $dataQuality): Collection
    {
        $actions = $deadlines->where('days_remaining', '<=', 30)->take(5)->map(fn (array $deadline) => [
            'key' => $deadline['type'].'-'.$deadline['id'],
            'title' => $deadline['label'],
            'description' => $deadline['days_remaining'] < 0
                ? 'Échéance dépassée de '.abs($deadline['days_remaining']).' jour(s)'
                : 'Échéance dans '.$deadline['days_remaining'].' jour(s)',
            'severity' => $deadline['severity'],
            'path' => $deadline['path'],
        ])->values();

        if ($maintenanceSummary['total'] > 0) {
            $actions->push([
                'key' => 'maintenance',
                'title' => $maintenanceSummary['total'].' maintenance(s) à traiter',
                'description' => $maintenanceSummary['overdue'].' en retard, '.$maintenanceSummary['due_soon'].' prochainement',
                'severity' => $maintenanceSummary['overdue'] > 0 ? 'critical' : 'warning',
                'path' => '/assets/all',
            ]);
        }
        if ($dataQuality['missing_project'] > 0) {
            $actions->push([
                'key' => 'unassigned-equipment',
                'title' => $dataQuality['missing_project'].' équipement(s) sans site',
                'description' => 'Affectation nécessaire pour fiabiliser le suivi.',
                'severity' => 'info',
                'path' => '/assets/all',
            ]);
        }

        return $actions->take(7)->values();
    }

    /** @return array<string, int> */
    private function dataQuality($query): array
    {
        return [
            'missing_serial' => (clone $query)->where(fn ($query) => $query->whereNull('serial_number')->orWhere('serial_number', ''))->count(),
            'missing_project' => (clone $query)->whereDoesntHave('currentProjectAssignment')->count(),
            'missing_custodian' => (clone $query)->whereNull('custodian_employee_id')->count(),
            'missing_purchase_date' => (clone $query)->whereNull('purchase_date')->count(),
        ];
    }

    /** @return array<string, int> */
    private function equipmentStatus($query, int $assigned): array
    {
        return [
            'assigned' => $assigned,
            'available' => (clone $query)->whereDoesntHave('currentProjectAssignment')->count(),
            'under_maintenance' => (clone $query)->where('operational_situation', 'under_maintenance')->count(),
            'to_monitor' => (clone $query)->where('condition', 'to_monitor')->count(),
            'out_of_service' => (clone $query)->where(fn ($query) => $query->where('condition', 'out_of_service')->orWhere('operational_situation', 'out_of_service'))->count(),
        ];
    }

    /** @return Collection<int, object> */
    private function equipmentCategories(): Collection
    {
        return DB::table('equipment')
            ->join('equipment_categories', 'equipment_categories.id', '=', 'equipment.equipment_category_id')
            ->where('equipment.is_active', true)
            ->select('equipment_categories.code', 'equipment_categories.name')
            ->selectRaw('COUNT(*) as total')
            ->groupBy('equipment_categories.id', 'equipment_categories.code', 'equipment_categories.name')
            ->orderByDesc('total')
            ->limit(8)
            ->get();
    }

    /** @return Collection<int, array<string, mixed>> */
    private function projectHealth(CarbonImmutable $today): Collection
    {
        $projects = Project::query()->where('is_active', true)->get(['id', 'name', 'responsible_employee_id']);
        $equipmentCounts = DB::table('equipment_project_assignments')->whereNull('ended_at')->selectRaw('project_id, COUNT(*) as total')->groupBy('project_id')->pluck('total', 'project_id');
        $bondAlerts = Bond::query()
            ->whereNotNull('project_id')
            ->whereNotNull('expires_on')
            ->whereDate('expires_on', '<=', $today->addDays(30))
            ->get(['id', 'project_id', 'bond_type', 'expires_on'])
            ->groupBy('project_id');
        $insuranceAlerts = InsurancePolicy::query()
            ->whereNotNull('project_id')
            ->whereNotNull('ends_on')
            ->whereDate('ends_on', '<=', $today->addDays(30))
            ->get(['id', 'project_id', 'policy_number', 'ends_on'])
            ->groupBy('project_id');

        return $projects->map(function (Project $project) use ($equipmentCounts, $bondAlerts, $insuranceAlerts, $today): array {
            $alertDetails = collect();

            foreach ($bondAlerts->get($project->id, collect()) as $bond) {
                $alertDetails->push($this->projectDeadlineAlert(
                    'bond',
                    'Caution · '.$bond->typeLabel(),
                    $bond->expires_on,
                    '/bonds',
                    $today,
                    'bond-'.$bond->id,
                ));
            }

            foreach ($insuranceAlerts->get($project->id, collect()) as $policy) {
                $alertDetails->push($this->projectDeadlineAlert(
                    'insurance',
                    'Assurance '.$policy->policy_number,
                    $policy->ends_on,
                    "/insurance/{$policy->id}",
                    $today,
                    'insurance-'.$policy->id,
                ));
            }

            if ($project->responsible_employee_id === null) {
                $alertDetails->push([
                    'key' => 'responsible-'.$project->id,
                    'type' => 'responsible',
                    'title' => 'Responsable non attribué',
                    'description' => 'Aucun responsable n’est associé à ce chantier.',
                    'severity' => 'warning',
                    'path' => "/sites/{$project->id}",
                ]);
            }

            $alerts = $alertDetails->count();

            return [
                'id' => $project->id,
                'name' => $project->name,
                'equipment_count' => (int) ($equipmentCounts[$project->id] ?? 0),
                'alert_count' => $alerts,
                'status' => $alerts >= 3 ? 'critical' : ($alerts > 0 ? 'attention' : 'healthy'),
                'path' => "/sites/{$project->id}",
                'alerts' => $alertDetails->values(),
            ];
        })->sortByDesc('alert_count')->take(6)->values();
    }

    /** @return array<string, mixed> */
    private function projectDeadlineAlert(string $type, string $title, $date, string $path, CarbonImmutable $today, string $key): array
    {
        $dueOn = CarbonImmutable::parse($date);
        $days = (int) $today->diffInDays($dueOn, false);

        return [
            'key' => $key,
            'type' => $type,
            'title' => $title,
            'description' => $days < 0
                ? 'Échéance dépassée de '.abs($days).' jour(s).'
                : ($days === 0 ? 'Échéance aujourd’hui.' : 'Échéance dans '.$days.' jour(s).'),
            'due_on' => $dueOn->format('Y-m-d'),
            'severity' => $days < 0 ? 'critical' : 'warning',
            'path' => $path,
        ];
    }
}
