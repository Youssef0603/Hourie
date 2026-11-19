export type PurchaseOrderItem = {
  id?: number;
  position?: number;
  budget_code: string | null;
  description: string;
  quantity: string;
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

export type PurchaseOrder = {
  id: number;
  number: string;
  supplier_name: string;
  supplier_phone: string | null;
  supplier_fax: string | null;
  ordered_on: string;
  follow_up_agent: string | null;
  contact_name: string | null;
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
  "id" | "number" | "subtotal" | "vat_amount" | "total" | "pdf_url" | "pdf_generated_at" | "delivery_notes" | "creator" | "created_at" | "updated_at"
>;
