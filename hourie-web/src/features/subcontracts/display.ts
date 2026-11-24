import { operationPhrase } from "../../i18n/operations";
import { formatMoney } from "../../shared/format";
import type { MaterialInput, PaymentChannel, PaymentMethod, ValuationKind, ValuationStatus } from "./types";

export const valuationStatusLabels: Record<ValuationStatus, string> = {
  draft: "Brouillon",
  submitted: "Soumise",
  approved: "Approuvée",
  partially_paid: "Partiellement payée",
  paid: "Payée",
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  transfer: "Virement",
  cheque: "Chèque",
  cash: "Espèces",
};

export const paymentChannelLabels: Record<PaymentChannel, string> = {
  cash: "Espèces",
  cheque: "Chèque / virement (HT)",
  vat: "TVA",
};

/** Name of an entry in the list of situations: the advance and the opening balance read differently. */
export function valuationTitle(valuation: { kind: ValuationKind; reference: string }) {
  if (valuation.kind === "advance") return operationPhrase("Avance de démarrage");
  if (valuation.kind === "opening") return operationPhrase("Reprise de l’historique");
  return valuation.reference;
}

/** Status label in the active language, evaluated at render time. */
export function valuationStatusLabel(status: ValuationStatus) {
  return operationPhrase(valuationStatusLabels[status]);
}

export function money(value: string | number | null | undefined, currency = "XOF") {
  return formatMoney(value ?? 0, currency);
}

const amountFormatter = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Amount without the currency, for narrow tables whose header states it. */
export function amount(value: string | number | null | undefined) {
  return amountFormatter.format(Number(value ?? 0));
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

export const emptyMaterial = (): MaterialInput => ({ key: newKey(), name: "", unit: "", quantity_per_unit: "", waste_percent: "5" });
