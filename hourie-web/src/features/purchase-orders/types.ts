export type PurchaseOrderItem = {
  id?: number;
  position?: number;
  budget_code: string | null;
  /** Subcontract material this line bought (ARH supplies it for a work item). */
  subcontract_item_material_id?: number | null;
  /** e.g. "821-01 · Pose des armatures — Fer HA" */
  material_label?: string | null;
  description: string;
  quantity: string;
  /** t, sac, m³… — forced to the material's unit when linked to a subcontract material. */
  unit?: string | null;
  unit_price: string;
  total?: string;
};

export type PurchaseOrderDeliveryNote = {
  id: number;
  url: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: { id: number; name: string } | null;
  created_at: string;
};

export type PurchaseOrderInvoice = {
  id: number;
  invoice_number: string;
  invoiced_on: string;
  amount: string;
  url: string;
  original_name: string;
  size_bytes: number;
  created_at: string;
};

/** Ordered (this purchase order) vs received (delivery notes) vs billed (invoices). */
export type PurchaseOrderInvoiceCheck = {
  status: "not_invoiced" | "amount_mismatch" | "missing_delivery_note" | "matched";
  invoiced_total: string;
  difference: string;
  has_delivery_note: boolean;
};

export type PurchaseOrder = {
  id: number;
  number: string;
  supplier_name: string;
  supplier_phone: string | null;
  supplier_fax: string | null;
  ordered_on: string;
  follow_up_agent: string | null;
  contact_name: string | null;
  project_id: number | null;
  project_name: string | null;
  reason: string | null;
  prepared_by: string | null;
  ordered_by: string | null;
  approved_by: string | null;
  vat_rate: string;
  currency: string;
  notes: string | null;
  pdf_url: string;
  pdf_generated_at: string | null;
  delivery_notes: PurchaseOrderDeliveryNote[];
  invoices?: PurchaseOrderInvoice[];
  invoice_check?: PurchaseOrderInvoiceCheck;
  items: PurchaseOrderItem[];
  subtotal: string;
  vat_amount: string;
  total: string;
  creator: { id: number; name: string };
  created_at: string;
  updated_at: string;
};

export type PurchaseOrderPayload = Omit<
  PurchaseOrder,
  "id" | "number" | "project_name" | "subtotal" | "vat_amount" | "total" | "pdf_url" | "pdf_generated_at" | "delivery_notes" | "invoices" | "invoice_check" | "creator" | "created_at" | "updated_at"
>;
