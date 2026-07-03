import { BRANDED_SEARCH_METRIC_KEY, METRICS } from '../../config/metrics';
import { brandedSearchOptions, brandedSearchSelectionLabel } from '../../lib/brandedSearch';
import { useDashboard } from '../../store/dashboardStore';
import { SearchableSelect } from '../common/SearchableSelect';
import { Dot } from '../common/ui';

export function BrandedSearchDemandControl() {
  const visible = useDashboard((s) => s.visible[BRANDED_SEARCH_METRIC_KEY]);
  const toggle = useDashboard((s) => s.toggleSeries);
  const brandedSearch = useDashboard((s) => s.brandedSearch);
  const brandedSearchProduct = useDashboard((s) => s.brandedSearchProduct);
  const setBrandedSearchProduct = useDashboard((s) => s.setBrandedSearchProduct);

  const def = METRICS[BRANDED_SEARCH_METRIC_KEY];
  const options = brandedSearchOptions(brandedSearch).map((value) => ({
    value,
    label: brandedSearchSelectionLabel(value),
  }));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <button
        type="button"
        className={`chip ${visible ? 'chip-on' : ''}`}
        onClick={() => toggle(BRANDED_SEARCH_METRIC_KEY)}
        aria-pressed={visible}
        style={visible ? { borderColor: def.color } : undefined}
      >
        <Dot color={visible ? def.color : 'var(--text-faint)'} />
        {def.short}
      </button>
      {visible ? (
        <SearchableSelect
          value={brandedSearchProduct}
          options={options}
          onChange={setBrandedSearchProduct}
          aria-label="Branded search product"
          searchPlaceholder="Search products…"
        />
      ) : null}
    </div>
  );
}

export function BrandedSearchScorecardPicker() {
  const brandedSearch = useDashboard((s) => s.brandedSearch);
  const brandedSearchProduct = useDashboard((s) => s.brandedSearchProduct);
  const setBrandedSearchProduct = useDashboard((s) => s.setBrandedSearchProduct);

  const options = brandedSearchOptions(brandedSearch).map((value) => ({
    value,
    label: brandedSearchSelectionLabel(value),
  }));

  return (
    <SearchableSelect
      value={brandedSearchProduct}
      options={options}
      onChange={setBrandedSearchProduct}
      aria-label="Branded search product for scorecard"
      searchPlaceholder="Search products…"
      className="searchable-select--compact"
    />
  );
}
