import { useMemo } from 'react';
import { useDashboard } from '../store/dashboardStore';
import { withBrandedSearchVolume } from '../lib/brandedSearch';

/** Weekly records with the selected branded-search product (or total) overlaid. */
export function useEffectiveRecords() {
  const records = useDashboard((s) => s.records);
  const brandedSearch = useDashboard((s) => s.brandedSearch);
  const brandedSearchProduct = useDashboard((s) => s.brandedSearchProduct);

  return useMemo(
    () => withBrandedSearchVolume(records, brandedSearch, brandedSearchProduct),
    [records, brandedSearch, brandedSearchProduct],
  );
}
