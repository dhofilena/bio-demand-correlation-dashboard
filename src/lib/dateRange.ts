/** Monday on or before `iso` (yyyy-mm-dd), UTC-aligned to match server adapters. */
export function mondayOf(iso: string): string {
  const d = new Date(iso);
  const day = d.getUTCDay();
  const diff = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

/** Sunday ending the Monday–Sunday week that contains `iso`. */
export function sundayOfWeekContaining(iso: string): string {
  const mon = new Date(`${mondayOf(iso)}T00:00:00Z`);
  mon.setUTCDate(mon.getUTCDate() + 6);
  return mon.toISOString().slice(0, 10);
}

/** Full Monday–Sunday bounds for demand API requests. */
export function normalizeDemandPeriod(start: string, end: string): { start: string; end: string } {
  return {
    start: mondayOf(start),
    end: sundayOfWeekContaining(end),
  };
}

/** Filter weekly rows by Monday week-start within the selected range. */
export function weekStartInRange(weekStart: string, start: string, end: string): boolean {
  const min = mondayOf(start);
  const max = mondayOf(end);
  return weekStart >= min && weekStart <= max;
}

/** Sunday that ended the week before the week containing `iso` (Mon–Sun weeks). */
export function lastWeekSunday(fromIso?: string): string {
  const ref = fromIso ?? new Date().toISOString().slice(0, 10);
  const thisMonday = new Date(`${mondayOf(ref)}T00:00:00Z`);
  thisMonday.setUTCDate(thisMonday.getUTCDate() - 1);
  return thisMonday.toISOString().slice(0, 10);
}

function subtractCalendarMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

/** Default dashboard window: 2 calendar months ending on last week's Sunday, start on a Monday. */
export function defaultDateRange(fromIso?: string): { start: string; end: string } {
  const end = lastWeekSunday(fromIso);
  const start = mondayOf(subtractCalendarMonths(end, 2));
  return { start, end };
}
