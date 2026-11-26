import { apiRequest } from "../../shared/api/http";
import type { TollBadge, TollBadgePayload } from "./types";

export function getTollBadges(equipmentId: number) {
  return apiRequest<{ data: TollBadge[] }>(`/api/v1/equipment/${equipmentId}/toll-badges`);
}

/** Empty optional fields are sent as null so the server clears them. */
function body(payload: TollBadgePayload) {
  const blankToNull = (value: string) => (value.trim() === "" ? null : value.trim());
  return JSON.stringify({
    ...payload,
    badge_number: payload.badge_number.trim(),
    serial_number: blankToNull(payload.serial_number),
    registered_phone: blankToNull(payload.registered_phone),
    balance: blankToNull(payload.balance),
    balance_checked_on: blankToNull(payload.balance_checked_on),
    notes: blankToNull(payload.notes),
  });
}

export function saveTollBadge(equipmentId: number, payload: TollBadgePayload, id?: number) {
  return apiRequest<{ data: TollBadge }>(
    id ? `/api/v1/equipment/${equipmentId}/toll-badges/${id}` : `/api/v1/equipment/${equipmentId}/toll-badges`,
    { method: id ? "PUT" : "POST", body: body(payload) },
  );
}

export function deleteTollBadge(equipmentId: number, id: number) {
  return apiRequest<void>(`/api/v1/equipment/${equipmentId}/toll-badges/${id}`, { method: "DELETE" });
}
