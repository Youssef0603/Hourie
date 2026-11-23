import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PurchaseOrdersPage } from "./PurchaseOrdersPage";

const { getPurchaseOrders, savePurchaseOrder } = vi.hoisted(() => ({
  getPurchaseOrders: vi.fn(),
  savePurchaseOrder: vi.fn(),
}));

vi.mock("../api", () => ({
  getPurchaseOrders,
  savePurchaseOrder,
  deletePurchaseOrder: vi.fn(),
  deletePurchaseOrderDeliveryNote: vi.fn(),
  downloadPurchaseOrderPdf: vi.fn(),
  uploadPurchaseOrderDeliveryNotes: vi.fn(),
}));

const savedOrder = {
  id: 1,
  number: "0000813",
  supplier_name: "Fournitures Abidjan",
  supplier_phone: null,
  supplier_fax: null,
  ordered_on: "2026-11-17",
  follow_up_agent: null,
  contact_name: null,
  project_name: "Bassam",
  reason: null,
  prepared_by: null,
  ordered_by: null,
  approved_by: null,
  vat_rate: "18.00",
  currency: "XOF",
  notes: null,
  pdf_url: "/api/v1/purchase-orders/1/pdf",
  pdf_generated_at: "2026-11-17T10:00:00Z",
  delivery_notes: [],
  items: [],
  subtotal: "1000.00",
  vat_amount: "180.00",
  total: "1180.00",
  creator: { id: 1, name: "Youssef" },
  created_at: "2026-11-17T10:00:00Z",
  updated_at: "2026-11-17T10:00:00Z",
};

describe("PurchaseOrdersPage", () => {
  beforeEach(() => {
    getPurchaseOrders.mockResolvedValue({ data: [], meta: { total: 0 } });
    savePurchaseOrder.mockReset();
  });

  it("creates a bon de commande with automatic totals", async () => {
    const user = userEvent.setup();
    render(<PurchaseOrdersPage defaultPreparedBy="Youssef Yassine" canManage />);

    await user.click(screen.getByRole("button", { name: "Créer un bon de commande" }));
    await user.type(screen.getByLabelText("Fournisseur"), "Fournitures Abidjan");
    await user.type(screen.getByLabelText("Description *"), "Ciment");
    const unitPrice = screen.getByLabelText("Prix unitaire *");
    await user.clear(unitPrice);
    await user.type(unitPrice, "39812.5");

    expect(screen.getByText("Total TTC").parentElement).toHaveTextContent(/39.*812,50.*F.*CFA/);
    expect(screen.getByDisplayValue("Youssef Yassine")).toBeInTheDocument();
  });

  it("shows saved documents in read-only mode without editing actions", async () => {
    getPurchaseOrders.mockResolvedValue({
      data: [savedOrder],
      meta: { total: 1 },
    });

    const user = userEvent.setup();
    render(<PurchaseOrdersPage defaultPreparedBy="Viewer" canManage={false} />);

    await waitFor(() => expect(screen.getByText("0000813")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "Créer un bon de commande" })).not.toBeInTheDocument();
    await user.click(screen.getByText("0000813"));
    expect(screen.queryByRole("button", { name: "Modifier" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aperçu" })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Détail du bon de commande 0000813" })).toBeInTheDocument();
  });

  it("returns to the order details when the editor or preview is closed", async () => {
    getPurchaseOrders.mockResolvedValue({ data: [savedOrder], meta: { total: 1 } });
    const user = userEvent.setup();
    render(<PurchaseOrdersPage defaultPreparedBy="Youssef Yassine" canManage />);

    await user.click(await screen.findByText("0000813"));
    const details = { name: "Détail du bon de commande 0000813" };

    await user.click(screen.getByRole("button", { name: "Modifier" }));
    expect(screen.queryByRole("dialog", details)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(screen.getByRole("dialog", details)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Aperçu" }));
    expect(screen.queryByRole("dialog", details)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fermer l’aperçu" }));
    expect(screen.getByRole("dialog", details)).toBeInTheDocument();
  });
});
