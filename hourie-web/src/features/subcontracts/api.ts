import { apiRequest, initializeCsrfProtection } from "../../shared/api/http";
import type { PaginatedResponse } from "../../shared/api/pagination";
import type {
  OpeningPayload,
  Subcontract,
  SubcontractPayload,
  SubcontractValuation,
  Subcontractor,
  ValuationPayload,
  VariationPayload,
} from "./types";

async function send<T>(path: string, method: string, body?: unknown): Promise<T> {
  await initializeCsrfProtection();
  return apiRequest<T>(path, {
    method,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
}

export function getSubcontracts(search = "", page = 1) {
  const params = new URLSearchParams({ per_page: "10", page: String(page) });
  if (search.trim()) params.set("search", search.trim());
  return apiRequest<PaginatedResponse<Subcontract>>(`/api/v1/subcontracts?${params}`);
}

export async function getSubcontract(id: number) {
  return (await apiRequest<{ data: Subcontract }>(`/api/v1/subcontracts/${id}`)).data;
}

export async function saveSubcontract(payload: SubcontractPayload, id?: number) {
  return (await send<{ data: Subcontract }>(id ? `/api/v1/subcontracts/${id}` : "/api/v1/subcontracts", id ? "PUT" : "POST", payload)).data;
}

export async function getSubcontractors() {
  return (await apiRequest<{ data: Subcontractor[] }>("/api/v1/subcontractors")).data;
}

export async function createSubcontractor(name: string) {
  return (await send<{ data: Subcontractor }>("/api/v1/subcontractors", "POST", { name })).data;
}

export async function createVariation(subcontractId: number, payload: VariationPayload) {
  return (await send<{ data: Subcontract }>(`/api/v1/subcontracts/${subcontractId}/variations`, "POST", payload)).data;
}

export async function getValuation(id: number) {
  return (await apiRequest<{ data: SubcontractValuation }>(`/api/v1/subcontract-valuations/${id}`)).data;
}

export async function saveValuation(payload: ValuationPayload, target: { subcontractId: number } | { valuationId: number }) {
  const path = "valuationId" in target
    ? `/api/v1/subcontract-valuations/${target.valuationId}`
    : `/api/v1/subcontracts/${target.subcontractId}/valuations`;
  return (await send<{ data: SubcontractValuation }>(path, "valuationId" in target ? "PUT" : "POST", payload)).data;
}

export type ValuationAction = "submit" | "return-to-draft" | "approve";

export type PaymentPayload = { amount: string; vat_amount: string; paid_on: string; method: string; reference: string };

/** Opening balance of a contract that started before Hourie. */
export async function saveOpening(subcontractId: number, payload: OpeningPayload) {
  return (await send<{ data: SubcontractValuation }>(`/api/v1/subcontracts/${subcontractId}/opening`, "POST", payload)).data;
}

export async function recordValuationPayment(id: number, payment: PaymentPayload) {
  return (await send<{ data: SubcontractValuation }>(`/api/v1/subcontract-valuations/${id}/payments`, "POST", payment)).data;
}

export async function deleteValuationPayment(id: number, paymentId: number) {
  return (await send<{ data: SubcontractValuation }>(`/api/v1/subcontract-valuations/${id}/payments/${paymentId}`, "DELETE")).data;
}

/** Sheet for the next situation, pre-filled with the contract history, to fill in on site. */
export function valuationSheetUrl(subcontractId: number) {
  return `/api/v1/subcontracts/${subcontractId}/valuation-sheet`;
}

/** The company's standard situation document (PDF). */
export function valuationPdfUrl(id: number) {
  return `/api/v1/subcontract-valuations/${id}/pdf`;
}

export async function runValuationAction(id: number, action: ValuationAction) {
  return (await send<{ data: SubcontractValuation }>(`/api/v1/subcontract-valuations/${id}/${action}`, "POST")).data;
}

export async function deleteValuation(id: number) {
  await send<void>(`/api/v1/subcontract-valuations/${id}`, "DELETE");
}

export async function saveValuationInvoice(id: number, invoice: { number: string; date: string; amount: string; file: File | null }) {
  const form = new FormData();
  form.append("invoice_number", invoice.number);
  form.append("invoice_date", invoice.date);
  form.append("invoice_amount", invoice.amount);
  if (invoice.file) form.append("invoice_file", invoice.file);
  return (await send<{ data: SubcontractValuation }>(`/api/v1/subcontract-valuations/${id}/invoice`, "POST", form)).data;
}

export async function uploadValuationDocuments(id: number, files: File[]) {
  const form = new FormData();
  files.forEach((file) => form.append("documents[]", file));
  await send(`/api/v1/subcontract-valuations/${id}/documents`, "POST", form);
}

/** Next work item code of a site, so new lines can show their code before saving. */
export async function getNextItemCode(projectId: number) {
  return (await apiRequest<{ data: { site_code: string; next_sequence: number } }>(`/api/v1/projects/${projectId}/next-subcontract-item-code`)).data;
}

export async function deleteSubcontract(id: number) {
  await send<void>(`/api/v1/subcontracts/${id}`, "DELETE");
}
