import { useMemo, useState } from 'react';
import { ChevronDown } from '../common/icons';
import type { ChartExportPayload } from '../../lib/chartExportData';

interface Props {
  data: ChartExportPayload;
}

export function ChartDataExport({ data }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const json = useMemo(() => JSON.stringify(data, null, 2), [data]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="chart-export">
      <button
        type="button"
        className={`chart-export__trigger${open ? ' chart-export__trigger--open' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <ChevronDown size={13} className={`scorecard-chevron${open ? ' scorecard-chevron--open' : ''}`} />
        <span>
          Chart data (JSON)
          <span className="chart-export__subtitle">
            Copy this payload into an AI tool for a plain-English read on the current {data.chartType} view.
          </span>
        </span>
      </button>
      <div className={`chart-export__collapse${open ? ' chart-export__collapse--open' : ''}`} aria-hidden={!open}>
        <div className="chart-export__collapse-inner">
          <div className="chart-export__body">
            <div className="chart-export__toolbar">
              <span className="chart-export__meta">
                {data.chartType === 'scatter'
                  ? `${data.points.length} weeks · ${data.valueMode} · ${data.lagWeeks}w lag`
                  : `${data.weeks.length} weeks · ${data.series.length} series · ${data.valueMode} · ${data.lagWeeks}w lag`}
              </span>
              <button type="button" className="btn" onClick={() => void copy()}>
                {copied ? 'Copied' : 'Copy JSON'}
              </button>
            </div>
            <pre className="chart-export__json">{json}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
