// Small date helpers shared by the server adapters. Weeks are Monday-started
// to match the source reporting sheets.

/** Return the Monday on/just before the given date as a yyyy-mm-dd string. */
export function mondayOf(date) {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // days since Monday
  d.setUTCDate(d.getUTCDate() - diff);
  return d.toISOString().slice(0, 10);
}

/** Inclusive list of Monday yyyy-mm-dd strings between start and end. */
export function mondaysBetween(start, end) {
  const out = [];
  let cur = new Date(mondayOf(start) + 'T00:00:00Z');
  const last = new Date(mondayOf(end) + 'T00:00:00Z');
  while (cur <= last) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 7);
  }
  return out;
}

export function weekLabel(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}
