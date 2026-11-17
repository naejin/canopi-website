/** @jsxImportSource preact */
// A plant's short marks as pills (boards FindResults, FindMulti, Paste; K12, c1r3 T13): an icon and a
// few words ("Mildly toxic", "Recorded as invasive in Kenya") in the warning or danger token, never
// colour alone; the full sentence stays in Details. Find's rows and Paste's rows both draw them here, so
// a mark reads the same in each. A site misfit or a conflict keeps its sentence: it names its reason.
import type { Taxon } from '../../../../lib/consortium/index.ts';
import { T } from '../../strings.ts';
import { WARN } from '../kit/sheet.tsx';
import type { Line } from '../kit/flags.ts';
import { countryName } from '../kit/names.ts';

const short = (t: Taxon, l: Line, country: string | null): string =>
  l.kind === 'toxicity' && t.warnings.toxicity ? T(`tox.${t.warnings.toxicity.level}`)
    : l.kind === 'invasive' && country ? T('find.invasiveShort', { country: countryName(country) })
      : l.text;

export function Marks({ t, lines, country }: { t: Taxon; lines: readonly Line[]; country: string | null }) {
  if (!lines.length) return null;
  return (
    <span class="ct-find-marks">
      {lines.map((l) => (
        <span class="ct-find-mark" data-kind={l.kind} data-level={l.level ?? (l.kind === 'invasive' ? 'danger' : 'warning')}>
          {WARN} {short(t, l, country)}
        </span>
      ))}
    </span>
  );
}
