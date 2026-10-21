import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "../../auth/types";
import { fr } from "../../../i18n/fr";
import type { Equipment } from "../types";
import { EquipmentDetailPanel } from "./EquipmentDetailPanel";

const user: AuthenticatedUser = {
  id: 1,
  name: "Test User",
  username: "test",
  email: null,
  role: "viewer",
  must_change_password: false,
  employee: null,
  permissions: {
    manage_equipment: false,
    manage_maintenance: false,
    delete_maintenance: false,
    delete_equipment: false,
    manage_sites: false,
    manage_users: false,
    manage_manager_accounts: false,
  },
};

function equipment(overrides: Partial<Equipment> = {}): Equipment {
  return {
    id: 1,
    display_id: "1",
    asset_code: "A.H-MAT-001",
    category: { id: 1, code: "equipment", name: "Matériel" },
    brand: "Atlas Copco",
    model: "XAS 97",
    serial_number: "APP796779",
    registration_number: null,
    manufacture_year: null,
    purchase_date: null,
    supplier: null,
    origin: null,
    asset_details: null,
    condition: null,
    current_location: null,
    current_project_assignment: null,
    custodian: null,
    responsible: null,
    responsible_source: null,
    power: null,
    fuel_type: null,
    observations: null,
    generator_details: null,
    maintenances: [],
    changes: [],
    images: [],
    invoices: [],
    vehicle_documents: [],
    insurance_policies: [],
    temporary_admissions: [],
    ...overrides,
  };
}

function renderPanel(selected: Equipment) {
  render(
    <EquipmentDetailPanel
      user={user}
      language="fr"
      selected={selected}
      options={null}
      isLoadingDetail={false}
      isEditingEquipment={false}
      onClose={() => undefined}
      onDelete={() => undefined}
      onEditingChange={() => undefined}
      onChanged={() => undefined}
      onRefreshSelected={async () => undefined}
      onMaintenanceChanged={async () => undefined}
      readOnly
    />,
  );
}

function section(title: string): HTMLDetailsElement {
  const details = screen.getByText(title, { selector: "h3" }).closest("details");
  if (!(details instanceof HTMLDetailsElement)) throw new Error(`Missing details section: ${title}`);
  return details;
}

describe("EquipmentDetailPanel section expansion", () => {
  it("opens populated optional sections", () => {
    renderPanel(equipment({
      observations: "Needs inspection",
      images: [{ id: 1, url: "/image", original_name: "asset.jpg", mime_type: "image/jpeg", size_bytes: 10, created_at: "2026-10-21T00:00:00Z" }],
      invoices: [{ id: 1, url: "/invoice", original_name: "invoice.pdf", mime_type: "application/pdf", size_bytes: 10, uploaded_by: null, created_at: "2026-10-21T00:00:00Z" }],
    }));

    expect(section(fr.equipment.observations)).toHaveAttribute("open");
    expect(section(fr.assets.photos)).toHaveAttribute("open");
    expect(section(fr.assets.invoices)).toHaveAttribute("open");
  });

  it("keeps empty optional sections collapsed", () => {
    renderPanel(equipment());

    expect(section(fr.equipment.observations)).not.toHaveAttribute("open");
    expect(section(fr.assets.photos)).not.toHaveAttribute("open");
    expect(section(fr.assets.invoices)).not.toHaveAttribute("open");
    expect(section("Assurance")).not.toHaveAttribute("open");
    expect(section("Admission temporaire")).not.toHaveAttribute("open");
  });
});
