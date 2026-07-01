import { inferSheetYear, parseWideDate, toNumber } from './shared';

export interface WideWeek {
  colIdx: number;
  iso: string;
  weekNumber: number;
}

export interface WideWeeklyLayout {
  rows: string[][];
  startDateRowIdx: number;
  dateColStart: number;
  weeks: WideWeek[];
}

const DAY_DATE_RE = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),/i;

export function looksLikeWeekDate(cell: string): boolean {
  return DAY_DATE_RE.test((cell ?? '').trim());
}

function findLabeledStartDateRow(rows: string[][]): { rowIdx: number; colStart: number } | null {
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    for (let c = 0; c < (rows[r]?.length ?? 0); c++) {
      if (/^start\s*date$/i.test((rows[r][c] ?? '').trim())) {
        return { rowIdx: r, colStart: c + 1 };
      }
    }
  }
  return null;
}

function findImplicitStartDateRow(rows: string[][]): { rowIdx: number; colStart: number } | null {
  let bestR = -1;
  let bestStart = -1;
  let bestCount = 0;
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r] ?? [];
    for (let start = 0; start < Math.min(row.length, 8); start++) {
      if (!looksLikeWeekDate(row[start] ?? '')) continue;
      let count = 0;
      for (let c = start; c < row.length && c < start + 60; c++) {
        if (looksLikeWeekDate(row[c] ?? '')) count++;
        else break;
      }
      if (count > bestCount) {
        bestCount = count;
        bestR = r;
        bestStart = start;
      }
    }
  }
  if (bestCount < 4) return null;
  return { rowIdx: bestR, colStart: bestStart };
}

function findWeekNumberRow(rows: string[][], startDateRowIdx: number, dateColStart: number): string[] | null {
  for (let r = startDateRowIdx + 1; r < Math.min(startDateRowIdx + 5, rows.length); r++) {
    const row = rows[r] ?? [];
    if (row.some((cell) => /^week\s*#?$/i.test((cell ?? '').trim()))) return row;

    let seq = 0;
    for (let c = dateColStart; c < dateColStart + 10; c++) {
      const n = toNumber(row[c]);
      if (n === seq + 1) seq = n;
      else break;
    }
    if (seq >= 4) return row;
  }
  return null;
}

/** Detect week columns from BIOptimizers wide exports (with or without a Start Date label). */
export function parseWideWeeklyLayout(rows: string[][]): WideWeeklyLayout | null {
  if (!rows.length) return null;

  const labeled = findLabeledStartDateRow(rows);
  const implicit = labeled ?? findImplicitStartDateRow(rows);
  if (!implicit) return null;

  return buildWideWeeklyLayout(rows, implicit.rowIdx, implicit.colStart);
}

/** Parse week columns when weekly values start at a fixed column (e.g. column WA). */
export function parseWideWeeklyLayoutFromColumn(rows: string[][], dateColStart: number): WideWeeklyLayout | null {
  if (!rows.length || dateColStart < 0) return null;

  const labeled = findLabeledStartDateRow(rows);
  let startDateRowIdx = labeled?.rowIdx ?? -1;
  if (startDateRowIdx < 0) {
    for (let r = 0; r < Math.min(rows.length, 15); r++) {
      if (looksLikeWeekDate(rows[r]?.[dateColStart] ?? '')) {
        startDateRowIdx = r;
        break;
      }
    }
  }
  if (startDateRowIdx < 0) return null;

  return buildWideWeeklyLayout(rows, startDateRowIdx, dateColStart);
}

function buildWideWeeklyLayout(
  rows: string[][],
  startDateRowIdx: number,
  dateColStart: number,
): WideWeeklyLayout | null {
  const sheetYear = inferSheetYear(rows);
  const startDateRow = rows[startDateRowIdx];
  const weekNumRow = findWeekNumberRow(rows, startDateRowIdx, dateColStart);

  const weeks: WideWeek[] = [];
  let prevIso: string | null = null;
  for (let c = dateColStart; c < startDateRow.length; c++) {
    const iso = parseWideDate(startDateRow[c] ?? '', sheetYear, prevIso);
    if (!iso) break;
    const weekNumber = toNumber(weekNumRow?.[c]) ?? weeks.length + 1;
    weeks.push({ colIdx: c, iso, weekNumber });
    prevIso = iso;
  }
  if (!weeks.length) return null;

  return { rows, startDateRowIdx, dateColStart, weeks };
}
