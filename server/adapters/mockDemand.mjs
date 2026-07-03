import { mondaysBetween, weekLabel } from '../dates.mjs';
import { brandedSearchGroupOrder } from '../brandedSearchGroups.mjs';

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
      googleOrganicSessions: Math.round((42000 + wave * 6000 + i * 900) * noise(5.3)),
      nonOrganicPageViews: Math.round((45000 + i * 1950 + wave * 3600) * noise(7.7)),
      gaOrganicRevenue: Math.round((22000 + wave * 3500 + i * 650) * noise(3.1)),
      gaPaidRevenue: Math.round((18000 + wave * 2800 + i * 520) * noise(4.8)),
      gaSocialRevenue: Math.round((8000 + wave * 1200 + i * 210) * noise(6.2)),
      gaOtherRevenue: Math.round((4000 + wave * 600 + i * 120) * noise(2.9)),
      dtcRevenue: Math.round((52000 + wave * 8000 + i * 1200) * noise(4.2)),
    };
  });
}

const MOCK_BRANDED_PRODUCTS = brandedSearchGroupOrder();

/** @returns {import('../../src/types/index.ts').BrandedSearchData} */
export function fetchMockBrandedSearch(start, end) {
  const weeks = mondaysBetween(start, end);
  const byProduct = {};
  const totalByWeek = new Map();

  for (const [pi, product] of MOCK_BRANDED_PRODUCTS.entries()) {
    const series = weeks.map((weekStart, i) => {
      const wave = Math.sin((i + pi) / 2.4);
      const noise = (s) => 1 + (seeded(i, s + pi, s * 1.3) - 0.5) * 0.14;
      const volume = Math.round((1800 + wave * 420 + pi * 180 + i * 35) * noise(9.1 + pi));
      const clicks = Math.round(volume * (0.08 + seeded(i, pi, 3.2) * 0.04));
      const avgPosition = Math.round((2.4 + seeded(i, pi, 7.5) * 1.8) * 100) / 100;

      const point = { weekStart, weekLabel: weekLabel(weekStart), volume, clicks, avgPosition };
      const total = totalByWeek.get(weekStart) ?? {
        weekStart,
        weekLabel: weekLabel(weekStart),
        volume: 0,
        clicks: 0,
        positionWeighted: 0,
        positionWeight: 0,
      };
      total.volume += volume;
      total.clicks += clicks;
      total.positionWeighted += avgPosition * volume;
      total.positionWeight += volume;
      totalByWeek.set(weekStart, total);
      return point;
    });
    byProduct[product] = series;
  }

  const total = [...totalByWeek.values()].map(
    ({ weekStart, weekLabel: label, volume, clicks, positionWeighted, positionWeight }) => ({
      weekStart,
      weekLabel: label,
      volume,
      clicks,
      avgPosition:
        positionWeight > 0 ? Math.round((positionWeighted / positionWeight) * 100) / 100 : null,
    }),
  );

  return {
    products: [...MOCK_BRANDED_PRODUCTS],
    byProduct,
    total,
  };
}
