// Pure seasonal ribbon & Dec→Jan year-wrap helpers (Wave 1, framework-free).

export type CalCellState = '' | 'bloom' | 'fruit' | 'both';
type RibbonSeg = '' | 'seg-start' | 'seg-mid' | 'seg-end' | 'seg-single';
type TrackCap = '' | 'cap-l' | 'cap-r' | 'cap-lr';

interface CalendarCellRun {
  seg: RibbonSeg;
  peak: boolean;
}

const FALLBACK_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const monthLabelCache = new Map<string, readonly string[]>();

/** Localized 12 short month labels (Jan..Dec, 1月..12月, etc.) cached per locale. */
export function localizedMonthLabels(locale = 'en'): readonly string[] {
  const key = locale || 'en';
  const hit = monthLabelCache.get(key);
  if (hit) return hit;
  try {
    const fmt = new Intl.DateTimeFormat(key, { month: 'short', timeZone: 'UTC' });
    const labels = Array.from({ length: 12 }, (_, i) => fmt.format(new Date(Date.UTC(2026, i, 15))));
    monthLabelCache.set(key, labels);
    return labels;
  } catch {
    return FALLBACK_MONTHS;
  }
}

/**
 * Compute seamless ribbon segments and one peak-month glyph per contiguous run,
 * merging Dec→Jan year-wrap runs so Jan start and Dec end stay square.
 */
export function computeCalendarRuns(states: readonly CalCellState[]): CalendarCellRun[] {
  const out: CalendarCellRun[] = states.map(() => ({ seg: '', peak: false }));
  if (states.length !== 12) return out;

  if (states[0] && states.every((s) => s === states[0])) {
    for (let i = 0; i < 12; i++) out[i] = { seg: 'seg-mid', peak: i === 5 };
    return out;
  }

  const runs: { state: CalCellState; start: number; end: number }[] = [];
  let i = 0;
  while (i < 12) {
    const st = states[i];
    if (!st) { i++; continue; }
    let j = i;
    while (j + 1 < 12 && states[j + 1] === st) j++;
    runs.push({ state: st, start: i, end: j });
    i = j + 1;
  }

  const wraps = runs.length >= 2
    && runs[0].start === 0
    && runs[runs.length - 1].end === 11
    && runs[0].state === runs[runs.length - 1].state;

  const processed = wraps ? runs.slice(1, -1) : runs;

  for (const r of processed) {
    const len = r.end - r.start + 1;
    const peakIdx = len <= 2 ? r.start : r.start + Math.floor(len / 2);
    for (let k = r.start; k <= r.end; k++) {
      const seg: RibbonSeg = len === 1 ? 'seg-single' : k === r.start ? 'seg-start' : k === r.end ? 'seg-end' : 'seg-mid';
      out[k] = { seg, peak: k === peakIdx };
    }
  }

  if (wraps) {
    const tail = runs[runs.length - 1];
    const head = runs[0];
    const tailLen = 12 - tail.start;
    const headLen = head.end + 1;
    const totalLen = tailLen + headLen;
    const peakIdx = totalLen <= 2 ? tail.start : (tail.start + Math.floor(totalLen / 2)) % 12;

    for (let k = tail.start; k <= 11; k++) {
      const seg: RibbonSeg = k === tail.start ? 'seg-start' : 'seg-mid';
      out[k] = { seg, peak: k === peakIdx };
    }
    for (let k = 0; k <= head.end; k++) {
      const seg: RibbonSeg = k === head.end ? 'seg-end' : 'seg-mid';
      out[k] = { seg, peak: k === peakIdx };
    }
  }

  return out;
}

/**
 * Compute wrap-aware rounded end caps for a single 12-month boolean track
 * (used by A1b MiniYearRibbon and Dossier 12-month phenology rows).
 */
export function computeTrackCaps(active: readonly boolean[]): TrackCap[] {
  return active.map((on, m) => {
    if (!on) return '';
    const prev = active[(m + 11) % 12];
    const next = active[(m + 1) % 12];
    if (!prev && !next) return 'cap-lr';
    if (!prev) return 'cap-l';
    if (!next) return 'cap-r';
    return '';
  });
}

/**
 * Format active month indices (0..11) into compact localized ranges, merging Dec→Jan wraps
 * (e.g. [0,1,2,3,4,10,11] → "Nov–May").
 */
export function formatWrappedMonthRanges(
  monthIndices: readonly number[],
  monthLabels: readonly string[] = FALLBACK_MONTHS,
): string {
  if (!monthIndices.length) return '';
  const uniq = [...new Set(monthIndices)].filter((m) => m >= 0 && m < 12).sort((a, b) => a - b);
  if (!uniq.length) return '';
  if (uniq.length === 12) return `${monthLabels[0]}–${monthLabels[11]}`;

  const runs: [number, number][] = [];
  let s = uniq[0];
  let p = uniq[0];
  for (let i = 1; i < uniq.length; i++) {
    if (uniq[i] === p + 1) {
      p = uniq[i];
    } else {
      runs.push([s, p]);
      s = p = uniq[i];
    }
  }
  runs.push([s, p]);

  if (runs.length >= 2 && runs[0][0] === 0 && runs[runs.length - 1][1] === 11) {
    const merged: [number, number] = [runs[runs.length - 1][0], runs[0][1]];
    const middle = runs.slice(1, -1);
    const ordered = [merged, ...middle];
    return ordered
      .map(([a, b]) => (a === b ? monthLabels[a] : `${monthLabels[a]}–${monthLabels[b]}`))
      .join(', ');
  }

  return runs
    .map(([a, b]) => (a === b ? monthLabels[a] : `${monthLabels[a]}–${monthLabels[b]}`))
    .join(', ');
}
