import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));

vi.mock("../../../shared/api/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../shared/api/http")>()),
  apiRequest,
}));

const dashboard = {
  generated_at: new Date().toISOString(),
  summary: {
    active_equipment: 312,
    active_projects: 7,
    tracked_projects: 9,
    operational_equipment: 169,
    availability_rate: 54,
    attention_points: 22,
  },
  priority_actions: [
    { key: "repair", title: "18 équipements à réparer", description: "5 hors service et 13 défectueux", severity: "critical", path: "/assets/all" },
    { key: "maintenance", title: "3 maintenances à planifier", description: "1 dépassée, 2 à moins de 50 heures", severity: "warning", path: "/assets/generator" },
  ],
  deadlines: [
    { id: 2, type: "temporary_admission", label: "AT S214", due_on: "2026-10-31", days_remaining: -3, severity: "critical", path: "/temporary-admissions/2" },
  ],
  data_quality: {
    completeness_percent: 62,
    missing_invoices: 24,
    missing_serials: 8,
    missing_projects: 5,
    missing_usage_status: 312,
  },
  recent_activity: [
    { id: 1, type: "maintenance_recorded", title: "Maintenance enregistrée", description: "A.H-GEN-292 · Himoinsa HSY-15", occurred_at: new Date().toISOString(), initials: "MK", path: "/assets/generator/12" },
  ],
};

describe("DashboardPage", () => {
  beforeEach(() => apiRequest.mockResolvedValue({ data: dashboard }));

  it("shows the executive overview and opens a priority action", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<DashboardPage onNavigate={onNavigate} />);

    expect(await screen.findByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    expect(screen.getByText("Synthèse du parc")).toBeVisible();
    expect(screen.getByText("Actifs suivis")).toBeVisible();
    expect(screen.getByText("Actions prioritaires")).toBeVisible();
    expect(screen.getByText("Échéances administratives")).toBeVisible();
    expect(screen.getByText("Qualité des données")).toBeVisible();
    expect(screen.getByText("Activité récente")).toBeVisible();
    expect(screen.getByText("La complétude globale de votre inventaire est de", { exact: false })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /18 équipements à réparer/ }));
    expect(onNavigate).toHaveBeenCalledWith("/assets/all");

    await user.click(screen.getByRole("button", { name: /24 factures manquantes/ }));
    expect(onNavigate).toHaveBeenCalledWith("/assets/all?without_invoice=1");

    await user.click(screen.getByRole("button", { name: /8 numéros de série manquants/ }));
    expect(onNavigate).toHaveBeenCalledWith("/assets/all?missing_serial=1");

    await user.click(screen.getByRole("button", { name: /5 actifs sans chantier/ }));
    expect(onNavigate).toHaveBeenCalledWith("/assets/all?unassigned=1");

    await user.click(screen.getByRole("button", { name: /312 utilisations actuelles à renseigner/ }));
    expect(onNavigate).toHaveBeenCalledWith("/assets/all?missing_usage_status=1");
  });
});
