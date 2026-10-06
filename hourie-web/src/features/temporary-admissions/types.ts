export type AdmissionDocumentType = "initial" | "renewal" | "invoice";
export type AdmissionDocument = {
  id: number;
  document_type: AdmissionDocumentType;
  document_date: string | null;
  original_name: string;
  size_bytes: number;
  url: string;
};
export type AdmissionEquipment = {
  id: number;
  asset_code: string;
  name: string;
  brand: string | null;
  model: string | null;
  chassis_number: string | null;
};
export type TemporaryAdmission = {
  id: number;
  customs_reference: string;
  entered_on: string;
  expires_on: string;
  status: "active" | "renewed" | "returned" | "cleared" | "expired";
  returned_on: string | null;
  closure_reason: string | null;
  cleared_on: string | null;
  clearance_reference: string | null;
  customs_duty_amount: string | null;
  notes: string | null;
  equipment: AdmissionEquipment[];
  documents: AdmissionDocument[];
};
