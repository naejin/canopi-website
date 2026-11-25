/** @jsxImportSource preact */
// Shared compact MiniYearRibbon (A1b, Dossier & Picker reuse) backed by pure src/lib/phenology.ts.
import type { Month } from '../../../../lib/palette/index.ts';
import { months as MONTHS } from '../../../../lib/palette/index.ts';
import {
  computeCalendarRuns,
  computeTrackCaps,
  formatWrappedMonthRanges,
  localizedMonthLabels as rawLocalizedMonthLabels,
  type CalCellState,
} from '../../../../lib/phenology.ts';
import { pageLang, T } from '../../strings.ts';
import { Glyph } from '../kit/Glyph.tsx';

export { computeCalendarRuns, computeTrackCaps, type CalCellState };

export function localizedMonthLabels(locale = pageLang()): readonly string[] {
  return rawLocalizedMonthLabels(locale);
}

function monthSetToIndices(mSet: ReadonlySet<string>): number[] {
  const out: number[] = [];
  for (let i = 0; i < MONTHS.length; i++) {
    if (mSet.has(MONTHS[i])) out.push(i);
  }
  return out;
}

/** Compact A1b dual-subtrack seasonal ribbon + quiet text summary (reused on plant rows & Picker). */
export function MiniYearRibbon({
  bloom,
  fruiting,
  compact = false,
}: {
  bloom: readonly Month[];
  fruiting: readonly Month[];
  compact?: boolean;
}) {
  if (!bloom.length && !fruiting.length) {
    return compact ? null : <span class="mini-unrec">{T('ns.cal.monthsUnknown')}</span>;
  }

  const bSet = new Set<string>(bloom);
  const fSet = new Set<string>(fruiting);
  const bActive = MONTHS.map((m) => bSet.has(m));
  const fActive = MONTHS.map((m) => fSet.has(m));
  const bCaps = computeTrackCaps(bActive);
  const fCaps = computeTrackCaps(fActive);
  const labels = localizedMonthLabels();
  const bRange = formatWrappedMonthRanges(monthSetToIndices(bSet), labels);
  const fRange = formatWrappedMonthRanges(monthSetToIndices(fSet), labels);

  const ariaParts: string[] = [];
  if (bRange) ariaParts.push(`${T('ns.cal.bloom')}: ${bRange}`);
  if (fRange) ariaParts.push(`${T('ns.cal.fruit')}: ${fRange}`);

  return (
    <div class={compact ? 'mini-year mini-year-compact' : 'mini-year'} aria-label={ariaParts.join(' · ')}>
      <span class="mini-ribbon" aria-hidden="true">
        {MONTHS.map((m, i) => (
          <span key={m} class="mini-cell">
            <span class={bActive[i] ? `mini-trk bloom ${bCaps[i]}`.trim() : 'mini-trk'} />
            <span class={fActive[i] ? `mini-trk fruit ${fCaps[i]}`.trim() : 'mini-trk'} />
          </span>
        ))}
      </span>
      <span class="mini-text">
        {bRange && (
          <span class="mini-seg">
            <Glyph name="bloom" size={14} class="yr-c-bloom" /> {bRange}
          </span>
        )}
        {bRange && fRange && <span aria-hidden="true">·</span>}
        {fRange && (
          <span class="mini-seg">
            <Glyph name="fruit" size={14} class="yr-c-fruit" /> {fRange}
          </span>
        )}
      </span>
    </div>
  );
}
