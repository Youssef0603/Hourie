export type DashboardSeverity = "critical" | "warning" | "info";

export type DashboardData = {
  generated_at: string;
  summary: {
    active_sites: number;
    active_equipment: number;
    assigned_equipment: number;
    unassigned_equipment: number;
    maintenance_alerts: number;
    critical_alerts: number;
    upcoming_deadlines: number;
    active_people: number;
  };
  urgent_actions: Array<{
    key: string;
    title: string;
    description: string;
    severity: DashboardSeverity;
    path: string;
  }>;
  deadlines: Array<{
    id: number;
    type: "insurance" | "bond" | "temporary_admission";
    label: string;
    due_on: string;
    days_remaining: number;
    severity: DashboardSeverity;
    path: string;
  }>;
  equipment_status: Record<
    "assigned" | "available" | "under_maintenance" | "to_monitor" | "out_of_service",
    number
  >;
  equipment_categories: Array<{ code: string; name: string; total: number }>;
  project_health: Array<{
    id: number;
    name: string;
    equipment_count: number;
    alert_count: number;
    status: "healthy" | "attention" | "critical";
    path: string;
    alerts: Array<{
      key: string;
      type: "bond" | "insurance" | "responsible";
      title: string;
      description: string;
      due_on?: string;
      severity: DashboardSeverity;
      path: string;
    }>;
  }>;
};
