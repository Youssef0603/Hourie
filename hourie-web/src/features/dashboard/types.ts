export type DashboardSeverity = "critical" | "warning" | "info";

export type DashboardData = {
  generated_at: string;
  summary: {
    active_equipment: number;
    active_projects: number;
    tracked_projects: number;
    operational_equipment: number;
    availability_rate: number;
    attention_points: number;
  };
  priority_actions: Array<{
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
  data_quality: {
    completeness_percent: number;
    missing_invoices: number;
    missing_serials: number;
    missing_projects: number;
    missing_usage_status: number;
  };
  recent_activity: Array<{
    id: number;
    type: string;
    title: string;
    description: string;
    occurred_at: string;
    initials: string;
    path: string;
  }>;
};
