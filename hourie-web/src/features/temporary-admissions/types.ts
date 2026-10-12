export type AdmissionDocumentType = "initial" | "admission" | "invoice";
export type AdmissionDocument = {
  id: number;
  document_type: AdmissionDocumentType;
  document_date: string | null;
  validity_months: number | null;
  original_name: string;
  size_bytes: number;
  url: string;
};
export type AdmissionHistoryEntry = {
  id: number;
  action: string;
  actor: { id: number; name: string } | null;
  occurred_at: string;
};
export type AdmissionEquipment = {
  id: number;
  asset_code: string;
  name: string;
  brand: string | null;
  model: string | null;
  serial_number?: string | null;
  chassis_number: string | null;
};
export type TemporaryAdmission = {
  id: number;
  customs_reference: string;
  supplier_name: string | null;
  entered_on: string;
  validity_months: number;
  expires_on: string;
  status: "active" | "returned" | "cleared" | "expired";
  returned_on: string | null;
  closure_reason: string | null;
  cleared_on: string | null;
  clearance_reference: string | null;
  customs_duty_amount: string | null;
  notes: string | null;
  documents_count?: number;
  equipment: AdmissionEquipment[];
  documents: AdmissionDocument[];
  changes?: AdmissionHistoryEntry[];
};
