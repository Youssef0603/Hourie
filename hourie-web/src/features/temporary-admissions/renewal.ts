/** Adds months to a YYYY-MM-DD date, keeping the last day of a shorter month (31 Jan + 1 = 28/29 Feb). */
export function addMonthsNoOverflow(date: string, months: number) {
  const [year, month, day] = date.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.toISOString().slice(0, 10);
}

const days = (from: string, to: string) => Math.abs(Date.parse(to) - Date.parse(from)) / 864e5;

/**
 * The expiry once a new AT is added: the same rule as the server. The new
 * period starts at the current expiry (stepped to the boundary closest to
 * the AT date) and lasts the AT's validity.
 */
export function predictAdmissionExpiry(currentExpiry: string, atDate: string, validityMonths: number) {
  const months = Math.max(1, validityMonths);
  let startsOn = currentExpiry;
  for (;;) {
    const next = addMonthsNoOverflow(startsOn, months);
    if (days(next, atDate) >= days(startsOn, atDate)) break;
    startsOn = next;
  }
  return addMonthsNoOverflow(startsOn, months);
}
