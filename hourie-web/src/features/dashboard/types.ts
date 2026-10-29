export type DashboardSeverity = "critical" | "warning" | "info";

export type DashboardAssetItem = {
  id: number;
  asset_code: string;
  label: string;
  category_code: string | null;
  category_name: string | null;
  serial_number: string | null;
  location_name: string | null;
  project_name: string | null;
  issues: string[];
  severity: DashboardSeverity;
  path: string;
};

export type DashboardMaintenanceItem = DashboardAssetItem & {
  current_engine_hours: number;
  next_maintenance_engine_hours: number;
  hours_remaining: number;
};

export type DashboardTransferItem = DashboardAssetItem & {
  occurred_at: string;
  from: string | null;
  to: string | null;
};

export type DashboardSection<T> = {
  total: number;
  items: T[];
};

export type DashboardData = {
  generated_at: string;
  sections: {
    repair_required: DashboardSection<DashboardAssetItem>;
    unknown_location: DashboardSection<DashboardAssetItem>;
    missing_identity_or_documents: DashboardSection<DashboardAssetItem>;
    maintenance_by_hours: DashboardSection<DashboardMaintenanceItem>;
    recent_transfers: DashboardSection<DashboardTransferItem>;
    incomplete_records: DashboardSection<DashboardAssetItem>;
  };
};
