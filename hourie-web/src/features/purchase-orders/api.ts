import { apiRequest, downloadAuthenticatedFile, initializeCsrfProtection } from "../../shared/api/http";
import type { PaginatedResponse } from "../../shared/api/pagination";
import type { PurchaseOrder, PurchaseOrderDeliveryNote, PurchaseOrderPayload } from "./types";

export function getPurchaseOrders(search = "", page = 1) {
  const params = new URLSearchParams({ per_page: "10", page: String(page) });
  if (search.trim()) params.set("search", search.trim());
  return apiRequest<PaginatedResponse<PurchaseOrder>>(`/api/v1/purchase-orders?${params}`);
}

export function savePurchaseOrder(payload: PurchaseOrderPayload, id?: number) {
  return apiRequest<{ data: PurchaseOrder }>(
    id ? `/api/v1/purchase-orders/${id}` : "/api/v1/purchase-orders",
    { method: id ? "PUT" : "POST", body: JSON.stringify(payload) },
  );
}

export function deletePurchaseOrder(id: number) {
  return apiRequest<void>(`/api/v1/purchase-orders/${id}`, { method: "DELETE" });
}

export function downloadPurchaseOrderPdf(order: PurchaseOrder) {
  const supplier = order.supplier_name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
  const filename = `Bon_de_commande_${order.number}${supplier ? `_${supplier}` : ""}.pdf`;

  return downloadAuthenticatedFile(order.pdf_url, filename);
}

export async function uploadPurchaseOrderDeliveryNotes(id: number, files: File[]) {
  await initializeCsrfProtection();
  const form = new FormData();
  files.forEach((file) => form.append("delivery_notes[]", file));

  return (await apiRequest<{ data: PurchaseOrderDeliveryNote[] }>(`/api/v1/purchase-orders/${id}/delivery-notes`, {
    method: "POST",
    body: form,
  })).data;
}

export async function deletePurchaseOrderDeliveryNote(purchaseOrderId: number, deliveryNoteId: number) {
  await initializeCsrfProtection();
  await apiRequest<void>(`/api/v1/purchase-orders/${purchaseOrderId}/delivery-notes/${deliveryNoteId}`, { method: "DELETE" });
}

export function previewPurchaseOrderDeliveryNote(deliveryNote: PurchaseOrderDeliveryNote) {
  const url = new URL(deliveryNote.url, window.location.origin);
  url.searchParams.set("preview", "1");
  const previewWindow = window.open(url.toString(), "_blank");
  if (previewWindow) previewWindow.opener = null;
  return previewWindow !== null;
}

export function downloadPurchaseOrderDeliveryNote(deliveryNote: PurchaseOrderDeliveryNote) {
  return downloadAuthenticatedFile(deliveryNote.url, deliveryNote.original_name);
}
