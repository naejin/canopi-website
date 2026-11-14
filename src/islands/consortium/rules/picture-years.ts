// Through the years (plant-palette-architecture 3.4; boards Main, Palette): who stands where as the plot
// grows up, one row per light level, one column per time step (the seven PHASE_YEARS spans). An empty
// judged cell of a light level is an open hole (an HTML button opening its fillers). Plants with no
// light level recorded are a row of their own, counted, never dropped. Pure; words are Lines.
import type { Hole, Line, PlantId, Taxon } from '../../../lib/consortium/index.ts';
import { PHASE_YEARS, strata, spans, yearsLine, yearsOf } from '../../../lib/consortium/index.ts';
import { holeAt, judgedColumn, lane, type Picture } from './picture.ts';

const L = (key: string, count?: number): Line => (count === undefined ? { key: `consortium.palette.${key}`, vars: {} } : { key: `consortium.palette.${key}`, vars: {}, count });

export interface PictureInput { members: readonly Taxon[]; holes: readonly Hole[]; nameOf: (t: Taxon) => string; first?: ReadonlySet<PlantId> }

export function yearsPicture({ members, holes, nameOf, first }: PictureInput): Picture {
  const columns = PHASE_YEARS.map(([from, to]) => yearsLine(from, to));
  const common = { nameOf, first, at: spans, judged: judgedColumn, years: yearsOf };
  const rows = strata.map((s) => lane(s, L(`light_${s}`), members.filter((t) => t.stratum?.value === s), columns.length, {
    ...common, holeAt: (c: number) => holeAt(holes, (h) => h.kind === 'light' && h.stratum === s, c),
  }));
  const none = members.filter((t) => !t.stratum);
  if (none.length) rows.push(lane('none', L('light_none'), none, columns.length, { ...common, holeAt: () => null, state: 'not-recorded' }));
  const open = holes.filter((h) => h.kind === 'light' && h.state === 'open').length;
  return {
    title: 'consortium.palette.yearsTitle', columns, rows,
    summary: [L('yearsSummary', members.length), L('yearsHoles', open)],
    names: Object.fromEntries(members.map((t) => [t.id, nameOf(t)])),
  };
}
