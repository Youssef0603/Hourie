/** "104522040.5" → "104 522 040,5": thousands separated, as amounts are read on paper. */
export function formatAmountInput(value: string) {
  if (value === "") return "";
  const [integer, decimals] = value.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return decimals === undefined ? grouped : `${grouped},${decimals}`;
}

/** What was typed, back to a plain number: spaces dropped, comma read as the decimal point, at most 2 decimals. */
export function parseAmountInput(text: string) {
  const cleaned = text.replace(/[\s  ]/g, "").replace(",", ".");
  const match = cleaned.match(/^(\d*)(?:\.(\d{0,2}))?/);
  if (!match || (match[1] === "" && match[2] === undefined)) return "";
  return match[2] === undefined ? match[1] : `${match[1] || "0"}.${match[2]}`;
}
