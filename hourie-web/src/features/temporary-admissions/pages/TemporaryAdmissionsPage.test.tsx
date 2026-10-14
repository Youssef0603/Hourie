import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TemporaryAdmissionsPage } from "./TemporaryAdmissionsPage";

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }));

vi.mock("../../../shared/api/http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../shared/api/http")>()),
  apiRequest,
}));

const admission = {
  id: 1,
  customs_reference: "S1445",
  supplier_name: "SinoTruk International",
  entered_on: "2026-10-06",
  validity_months: 12,
  expires_on: "2027-10-06",
  status: "active",
  returned_on: null,
  closure_reason: null,
  cleared_on: null,
  clearance_reference: null,
  customs_duty_amount: null,
  notes: null,
  equipment: [
    {
      id: 8,
      asset_code: "GEN-008",
      name: "Perkins 250 KVA",
      brand: "Perkins",
      model: "250 KVA",
      serial_number: "SER-008",
      chassis_number: "CH-008",
    },
    {
      id: 9,
      asset_code: "A.H-CAM-021",
      name: "SinoTruck Howo 17m3 HOWO 336",
      brand: "SinoTruck",
      model: "Howo 17m3 HOWO 336",
      serial_number: "SER-009",
      chassis_number: null,
    },
  ],
  documents: [
    {
      id: 2,
      document_type: "initial",
      document_date: "2026-10-06",
      original_name: "AT-S1445.pdf",
      size_bytes: 1200,
      url: "/api/v1/temporary-admissions/1/documents/2/file",
    },
  ],
};

describe("TemporaryAdmissionsPage", () => {
  beforeEach(() => {
    apiRequest.mockImplementation((path: string) => {
      if (path.startsWith("/api/v1/temporary-admissions?")) {
        return Promise.resolve({
          data: [{ ...admission, equipment: [], documents: [], documents_count: admission.documents.length }],
          meta: { current_page: 1, from: 1, last_page: 1, per_page: 10, to: 1, total: 1 },
        });
      }
      if (path === "/api/v1/temporary-admissions/1") {
        return Promise.resolve({ data: admission });
      }
      if (path === "/api/v1/temporary-admissions/1/documents") {
        return Promise.resolve({ data: admission });
      }
      if (path === "/api/v1/temporary-admission-equipment-options") {
        return Promise.resolve({ data: admission.equipment });
      }
      return Promise.reject(new Error(`Unexpected request: ${path}`));
    });
  });

  it("keeps covered equipment out of the table and displays it in details", async () => {
    const user = userEvent.setup();
    render(<TemporaryAdmissionsPage canManage />);

    expect(await screen.findByText("S1445")).toBeVisible();
    expect(screen.queryByText("Perkins 250 KVA")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: /Équipement/ }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByText("S1445"));
    expect(await screen.findByText("Perkins 250 KVA")).toBeVisible();
    expect(screen.getByText("N° de série : SER-008")).toBeVisible();
    expect(screen.getByText("AT-S1445.pdf")).toBeVisible();
    await waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(3));
  });

  it("shows equipment names and serial numbers in the add dropdown", async () => {
    const user = userEvent.setup();
    render(<TemporaryAdmissionsPage canManage />);
    await screen.findByText("S1445");

    await user.click(
      screen.getByRole("button", { name: "Ajouter une admission temporaire" }),
    );
    await user.click(
      screen.getByRole("combobox", { name: "Ajouter un équipement" }),
    );
    await user.type(
      screen.getByRole("combobox", { name: "Ajouter un équipement" }),
      "perkins",
    );

    expect(
      await screen.findByText("Perkins 250 KVA — N° de série : SER-008"),
    ).toBeVisible();
    await user.click(screen.getByText("Perkins 250 KVA — N° de série : SER-008"));
    expect(screen.getByRole("combobox", { name: "Ajouter un équipement" })).toHaveValue("perkins");

    await user.clear(screen.getByRole("combobox", { name: "Ajouter un équipement" }));
    await user.type(
      screen.getByRole("combobox", { name: "Ajouter un équipement" }),
      "sinotruck",
    );
    await user.click(screen.getByText("SinoTruck Howo 17m3 HOWO 336 — N° de série : SER-009"));
    await user.keyboard("{Escape}");

    expect(screen.getByRole("combobox", { name: "Ajouter un équipement" })).toHaveValue("2 équipements sélectionnés");
    expect(screen.getByText("Perkins 250 KVA")).toBeVisible();
    expect(screen.getByText("SinoTruck Howo 17m3 HOWO 336")).toBeVisible();
    expect(screen.queryByText(/^8$/)).not.toBeInTheDocument();
  });

  it("accepts declaration and invoice documents without requiring an AT during creation", async () => {
    const user = userEvent.setup();
    const { container } = render(<TemporaryAdmissionsPage canManage />);
    await screen.findByText("S1445");

    await user.click(
      screen.getByRole("button", { name: "Ajouter une admission temporaire" }),
    );

    const fileInputs = container.querySelectorAll<HTMLInputElement>(
      'input[type="file"]',
    );
    await user.upload(fileInputs[0], [
      new File(["initial-1"], "initial-page-1.pdf", {
        type: "application/pdf",
      }),
      new File(["initial-2"], "initial-page-2.pdf", {
        type: "application/pdf",
      }),
    ]);
    await user.upload(fileInputs[1], [
      new File(["invoice-1"], "facture-1.pdf", {
        type: "application/pdf",
      }),
      new File(["invoice-2"], "facture-2.pdf", {
        type: "application/pdf",
      }),
    ]);

    expect(fileInputs).toHaveLength(2);
    expect(screen.getByText("2 documents de déclaration sélectionnés")).toBeVisible();
    expect(screen.getByText("2 factures sélectionnées")).toBeVisible();
    expect(screen.queryByText("Date de l’AT")).not.toBeInTheDocument();
    expect(screen.getByText("facture-2.pdf")).toBeVisible();
  });

  it("matches covered equipment without requiring literal spacing", async () => {
    const user = userEvent.setup();
    render(<TemporaryAdmissionsPage canManage />);
    await user.click(await screen.findByText("S1445"));

    await user.type(
      screen.getByRole("searchbox", {
        name: "Rechercher un équipement couvert",
      }),
      "sino truck",
    );

    expect(screen.getByText("SinoTruck Howo 17m3 HOWO 336")).toBeVisible();
    expect(screen.queryByText("Perkins 250 KVA")).not.toBeInTheDocument();
  });

  it("does not show an error after an AT document uploads successfully", async () => {
    const user = userEvent.setup();
    const { container } = render(<TemporaryAdmissionsPage canManage />);
    await user.click(await screen.findByText("S1445"));

    fireEvent.change(screen.getByLabelText("Date de l’AT"), {
      target: { value: "2027-10-06" },
    });
    const fileInputs = container.querySelectorAll<HTMLInputElement>(
      'input[type="file"]',
    );
    await user.upload(
      fileInputs[1],
      new File(["AT"], "AT-S1445-2027.pdf", { type: "application/pdf" }),
    );
    await user.click(screen.getByRole("button", { name: "Ajouter l’AT" }));

    await waitFor(() =>
      expect(screen.queryByText("AT-S1445-2027.pdf")).not.toBeInTheDocument(),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("returns to admission details when editing is cancelled", async () => {
    const user = userEvent.setup();
    render(<TemporaryAdmissionsPage canManage />);

    await user.click(await screen.findByText("S1445"));
    const details = await screen.findByRole("dialog", {
      name: "Détail de l’admission temporaire",
    });
    await user.click(within(details).getByRole("button", { name: "Modifier" }));

    const editor = screen.getByRole("dialog", { name: "Modifier l’admission" });
    await user.click(within(editor).getByRole("button", { name: "Fermer" }));

    expect(
      await screen.findByRole("dialog", {
        name: "Détail de l’admission temporaire",
      }),
    ).toBeVisible();
  });
});
