import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));

vi.mock("../../../shared/api/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../shared/api/http")>()),
  apiRequest,
}));

const dashboard = {
  generated_at: "2026-10-08T10:00:00.000Z",
  summary: {
    active_sites: 7,
    active_equipment: 284,
    assigned_equipment: 44,
    unassigned_equipment: 240,
    maintenance_alerts: 2,
    critical_alerts: 3,
    upcoming_deadlines: 3,
    active_people: 28,
  },
  urgent_actions: [{ key: "insurance-1", title: "Assurance POL-1", description: "Échéance dans 10 jours", severity: "warning", path: "/insurance/1" }],
  deadlines: [{ id: 1, type: "insurance", label: "Assurance POL-1", due_on: "2026-10-18", days_remaining: 10, severity: "warning", path: "/insurance/1" }],
  equipment_status: { assigned: 44, available: 240, to_monitor: 2, out_of_service: 0 },
  equipment_categories: [{ code: "generator", name: "Générateurs", total: 24 }],
  project_health: [{
    id: 1,
    name: "Bassam",
    equipment_count: 12,
    alert_count: 1,
    status: "attention",
    path: "/sites/1",
    alerts: [{ key: "responsible-1", type: "responsible", title: "Responsable non attribué", description: "Aucun responsable n’est associé à ce chantier.", severity: "warning", path: "/sites/1" }],
  }],
};

describe("DashboardPage", () => {
  beforeEach(() => apiRequest.mockResolvedValue({ data: dashboard }));

  it("shows executive metrics and navigates from actionable content", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<DashboardPage onNavigate={onNavigate} />);

    expect(await screen.findByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    expect(screen.getAllByText("284")[0]).toBeVisible();
    expect(screen.getByRole("button", { name: /28.*Personnel actif/ })).toBeVisible();
    expect(screen.getAllByText("Assurance POL-1")).toHaveLength(2);
    expect(screen.getByText("Bassam")).toBeVisible();
    await user.click(screen.getByRole("button", { name: /Chantiers actifs/ }));
    expect(onNavigate).toHaveBeenCalledWith("/sites");

    await user.click(screen.getAllByRole("button", { name: /Assurance POL-1.*Échéance dans 10 jours/ })[0]);
    expect(onNavigate).toHaveBeenCalledWith("/insurance/1");

    await user.click(screen.getByRole("button", { name: /Bassam.*1 alerte/ }));
    expect(screen.getByRole("dialog", { name: "Alertes · Bassam" })).toBeVisible();
    expect(screen.getByText("Responsable non attribué")).toBeVisible();
  });

  it("keeps the dashboard compact and opens all priority actions on demand", async () => {
    const user = userEvent.setup();
    const urgentActions = Array.from({ length: 6 }, (_, index) => ({
      key: `insurance-${index + 1}`,
      title: `Assurance POL-${index + 1}`,
      description: `Échéance dans ${index + 1} jours`,
      severity: "warning",
      path: `/insurance/${index + 1}`,
    }));
    apiRequest.mockResolvedValueOnce({ data: { ...dashboard, urgent_actions: urgentActions } });

    render(<DashboardPage onNavigate={vi.fn()} />);

    expect(await screen.findByText("Assurance POL-4")).toBeVisible();
    expect(screen.queryByText("Assurance POL-5")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Voir toutes les actions" }));

    const dialog = screen.getByRole("dialog", { name: "Toutes les actions prioritaires" });
    expect(within(dialog).getByText("Assurance POL-5")).toBeVisible();
    expect(within(dialog).getByText("Assurance POL-6")).toBeVisible();
  });
});
