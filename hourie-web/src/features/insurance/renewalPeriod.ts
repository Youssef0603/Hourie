import { shiftDate, todayIso } from "../../shared/renewal";

/** The next period: it starts the day after the old one ends, and lasts one year. */
export function nextInsurancePeriod(endsOn: string | null, today = todayIso()) {
  const startsOn = endsOn ? shiftDate(endsOn, 1) : today;
  return { startsOn, endsOn: shiftDate(startsOn, -1, 1) };
}
