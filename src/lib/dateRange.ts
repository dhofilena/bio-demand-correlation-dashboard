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
