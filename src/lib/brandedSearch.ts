import { BRANDED_SEARCH_TOTAL } from '../config/metrics';
import type { BrandedSearchData, BrandedSearchWeekPoint, WeeklyRecord } from '../types';

export type BrandedSearchSelection = typeof BRANDED_SEARCH_TOTAL | string;

export function brandedSearchSelectionLabel(selection: BrandedSearchSelection): string {
  return selection === BRANDED_SEARCH_TOTAL ? 'Total (all products)' : selection;
}

export function brandedSearchOptions(data: BrandedSearchData | null): BrandedSearchSelection[] {
  if (!data?.products.length) return [BRANDED_SEARCH_TOTAL];
  const sorted = [...data.products].sort((a, b) => {
    const order = [
      'Magnesium Breakthrough',
      'Brand / BIOptimizers',
      'MassZymes',
      'Sleep Breakthrough',
      'Berberine Breakthrough',
      'Probiotic Breakthrough / P3-OM',
      'CogniBiotics',
      'HCL Breakthrough',
      'Gluten Guardian',
      'kApex',
      'Blood Sugar Breakthrough',
      'Protein Breakthrough',
      'VegZymes',
    ];
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });
  return [BRANDED_SEARCH_TOTAL, ...sorted];
}

function seriesForSelection(
  data: BrandedSearchData,
  selection: BrandedSearchSelection,
): BrandedSearchWeekPoint[] {
  if (selection === BRANDED_SEARCH_TOTAL) return data.total;
  return data.byProduct[selection] ?? [];
}

/** Overlay branded search volume onto weekly records for charts, correlation, and scorecard. */
export function withBrandedSearchVolume(
  records: WeeklyRecord[],
  data: BrandedSearchData | null,
  selection: BrandedSearchSelection,
): WeeklyRecord[] {
  if (!data) {
    return records.map((r) => ({ ...r, brandedSearchVolume: null }));
  }

  const byWeek = new Map(
    seriesForSelection(data, selection).map((p) => [p.weekStart, p.volume]),
  );

  return records.map((r) => ({
    ...r,
    brandedSearchVolume: byWeek.get(r.weekStart) ?? null,
  }));
}
