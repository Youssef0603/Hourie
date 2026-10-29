import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));

vi.mock("../../../shared/api/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../shared/api/http")>()),
  apiRequest,
}));

const asset = {
  id: 12,
  asset_code: "A.H-GEN-292",
  label: "Himoinsa HSY-15",
  category_code: "generator",
  category_name: "Générateurs",
  serial_number: "X1CH128057",
  location_name: "Centrale",
  project_name: "Gesco",
  issues: ["Défectueux"],
  severity: "critical",
  path: "/assets/generator/12",
};

const dashboard = {
  generated_at: new Date().toISOString(),
  sections: {
    repair_required: { total: 1, items: [asset] },
    unknown_location: { total: 4, items: [{ ...asset, id: 13, asset_code: "A.H-POM-326", issues: ["Localisation physique inconnue"], severity: "warning" }] },
    missing_identity_or_documents: { total: 3, items: [{ ...asset, id: 14, asset_code: "A.H-CAM-102", issues: ["Aucun document"], severity: "warning" }] },
    maintenance_by_hours: { total: 1, items: [{ ...asset, current_engine_hours: 1490, next_maintenance_engine_hours: 1500, hours_remaining: 10, issues: ["Entretien proche"], severity: "warning" }] },
    recent_transfers: { total: 1, items: [{ ...asset, occurred_at: "2026-10-28T10:00:00.000Z", from: "Bassam", to: "Gesco", issues: ["Affectation mise à jour"], severity: "info" }] },
    incomplete_records: { total: 9, items: [{ ...asset, id: 15, asset_code: "A.H-MAT-327", issues: ["Fournisseur à compléter"], severity: "info" }] },
  },
};

describe("DashboardPage", () => {
  beforeEach(() => apiRequest.mockResolvedValue({ data: dashboard }));

  it("shows the six operational queues and opens the affected asset", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<DashboardPage onNavigate={onNavigate} />);

    expect(await screen.findByRole("heading", { name: "Tableau de bord" })).toBeVisible();
    expect(screen.getAllByText("Équipements à réparer")[0]).toBeVisible();
    expect(screen.getAllByText("Localisation inconnue")[0]).toBeVisible();
    expect(screen.getAllByText("Identification et documents")[0]).toBeVisible();
    expect(screen.getAllByText("Entretien par heures moteur")[0]).toBeVisible();
    expect(screen.getAllByText("Transferts récents")[0]).toBeVisible();
    expect(screen.getAllByText("Fiches à compléter")[0]).toBeVisible();
    expect(screen.getByText("10 h restantes")).toBeVisible();
    expect(screen.getByText("Bassam → Gesco")).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: /A.H-GEN-292/ })[0]);
    expect(onNavigate).toHaveBeenCalledWith("/assets/generator/12");
  });
});
