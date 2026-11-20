import { formatMoney } from "../../shared/format";
import type { ValuationStatus } from "./types";

export const valuationStatusLabels: Record<ValuationStatus, string> = {
  draft: "Brouillon",
  submitted: "Soumise",
  approved: "Approuvée",
  paid: "Payée",
};

export function money(value: string | number | null | undefined, currency = "XOF") {
  return formatMoney(value ?? 0, currency);
}

const quantityFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 });

export function quantity(value: string | number | null | undefined) {
  return quantityFormatter.format(Number(value ?? 0));
}

export function percent(part: string | number, whole: string | number) {
  const total = Number(whole);
  return total > 0 ? Math.min(100, Math.round((Number(part) / total) * 1000) / 10) : 0;
}

export function newKey() {
  return crypto.randomUUID();
}


/** Work item code as the server builds it: {site code}-{sequence}, e.g. 821-07. */
export function itemCode(siteCode: string, sequence: number) {
  return `${siteCode}-${String(sequence).padStart(2, "0")}`;
}

/**
 * Codes for lines in display order: saved lines keep theirs, new lines get the
 * next free codes of the site in the order they appear.
 */
export function previewCodes(lines: Array<{ code?: string | null }>, next: { site_code: string; next_sequence: number } | null) {
  let sequence = next?.next_sequence ?? 0;
  return lines.map((line) => line.code || (next ? itemCode(next.site_code, sequence++) : "—"));
}
