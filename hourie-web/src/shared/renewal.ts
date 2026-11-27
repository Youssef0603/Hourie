/** Today as YYYY-MM-DD. */
export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

/** Adds days (and optionally years) to a YYYY-MM-DD date, in UTC so no timezone shifts the day. */
export function shiftDate(date: string, days: number, years = 0) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCFullYear(value.getUTCFullYear() + years);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
