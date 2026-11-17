import { apiRequest } from "../../shared/api/http";
import type { PaginatedResponse } from "../../shared/api/pagination";
import type { PurchaseOrder, PurchaseOrderPayload } from "./types";

export function getPurchaseOrders(search = "") {
  const params = new URLSearchParams({ per_page: "50" });
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
