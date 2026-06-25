import { mondaysBetween, weekLabel } from '../dates.mjs';

// Deterministic mock demand adapter. Used for local development and as the
// fallback whenever a live adapter is unconfigured or fails. Produces the same
// demand shape the real adapters return, so the rest of the pipeline is
// identical in mock and live modes.

function seeded(i, seedA, seedB) {
  // Cheap deterministic pseudo-random in [0,1).
  const x = Math.sin(i * seedA + seedB) * 10000;
  return x - Math.floor(x);
}

/** @returns {Array<object>} partial weekly demand records for the range. */
export function fetchMockDemand(start, end) {
  const weeks = mondaysBetween(start, end);
  return weeks.map((weekStart, i) => {
    const wave = Math.sin(i / 2.2); // gentle multi-week wave
    const noise = (s) => 1 + (seeded(i, s, s * 1.7) - 0.5) * 0.12;
    return {
      weekStart,
      weekLabel: weekLabel(weekStart),
      amazonSearchVolume: Math.round((9500 + wave * 2500 + i * 250) * noise(3.1)),
      googleOrganicSessions: Math.round((42000 + wave * 6000 + i * 900) * noise(5.3)),
      nonOrganicPageViews: Math.round((45000 + i * 1950 + wave * 3600) * noise(7.7)),
      amazonRevenue: Math.round((46000 + wave * 12000 + i * 1500) * noise(2.9)),
      dtcRevenue: Math.round((52000 + wave * 8000 + i * 1200) * noise(4.2)),
    };
  });
}
