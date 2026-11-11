// The strata × phases matrix of a consortium on a site (stream S1; design check §2, §4; coordinator
// row "v2 mockup choices" 2026-11-11). Four strata, top to bottom, by seven phases. A plant fills
// every cell of its stratum from its start to its end phase, with the placement it has in the chosen
// climate, or, for a guest added from another climate's list, its home placement (Taxon.from). One
// plant fills a cell: there is no "thin" state.
//
// An empty cell says why, from the climate's plants (the pool) that grow there:
// - 'gap': none at all ("No plant in the list for this cell yet": a data gap, not the site);
// - 'misfit': some, but every one misfits the site ("No plant fits your site here"), with the count
//   per site answer and whether the counts overlap ("some for both reasons");
// - null: a free cell, with `fitting` plants that fit (an unknown fits).
// Gap and misfit cells cannot be filled here and never count against the reader in the fill meter.
import type { ClimateZone, Matrix, MatrixCell, Phase, PhaseOrd, PlantId, Site, SiteKey, Stratum, Taxon, CellRef } from './types.ts';
import { phases, strata } from './types.ts';
import { canopyOf, fits, misfitsBeside } from './site.ts';
import { phaseSpan } from './jobs.ts';

export const phaseOrd = (p: Phase): PhaseOrd => phases.indexOf(p) as PhaseOrd;

// The cells a plant fills: its stratum in each phase of its span, in phase order.
export function cellsOf(taxon: Taxon): CellRef[] {
  const s = taxon.stratum?.value;
  return s ? phaseSpan(taxon).map((p) => [s, p] as const) : [];
}

// The cell a plant is listed under (each plant once, under its start; null when it has no placement).
export function startCell(taxon: Taxon): CellRef | null {
  const s = taxon.stratum?.value;
  return s && taxon.phases ? [s, phaseOrd(taxon.phases.start)] : null;
}

export const cellKey = (stratum: Stratum, phase: number): number => strata.indexOf(stratum) * 7 + phase;

const spans = (t: Taxon, stratum: Stratum, phase: number) => {
  if (t.stratum?.value !== stratum || !t.phases) return false;
  return phases.indexOf(t.phases.start) <= phase && phase <= phases.indexOf(t.phases.end);
};

// The pool's plants that grow in one cell (for "Show them anyway" and the cell's Add list).
export function plantsIn(pool: Taxon[], stratum: Stratum, phase: number): Taxon[] {
  return pool.filter((t) => spans(t, stratum, phase));
}

export function buildMatrix(climate: ClimateZone, pool: Taxon[], members: Taxon[], site: Site): Matrix {
  const canopy = canopyOf(members);
  const inList = new Array<number>(28).fill(0), fitting = new Array<number>(28).fill(0);
  const reasons: Partial<Record<SiteKey, number>>[] = Array.from({ length: 28 }, () => ({}));
  const unplaced: PlantId[] = [];
  for (const t of pool) {
    const cells = cellsOf(t);
    if (!cells.length) { unplaced.push(t.id); continue; }
    const fit = fits(t, site);
    const misfits = fit.misfits.length ? misfitsBeside(t, site, canopy, fit) : [];
    for (const [s, p] of cells) {
      const k = cellKey(s, p);
      inList[k]++;
      if (!misfits.length) fitting[k]++;
      else for (const key of misfits) reasons[k][key] = (reasons[k][key] ?? 0) + 1;
    }
  }
  const byCell: PlantId[][] = Array.from({ length: 28 }, () => []);
  const seen = new Set<PlantId>();
  for (const t of members) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    for (const [s, p] of cellsOf(t)) byCell[cellKey(s, p)].push(t.id);
  }
  let filled = 0, cannot = 0;
  const rows = strata.map((stratum) => ({
    stratum,
    cells: phases.map((_, phase): MatrixCell => {
      const k = cellKey(stratum, phase);
      const here = byCell[k];
      const empty = here.length ? null : inList[k] === 0 ? 'gap' : fitting[k] === 0 ? 'misfit' : null;
      if (here.length) filled++;
      else if (empty) cannot++;
      const r = empty === 'misfit' ? reasons[k] : {};
      const sum = Object.values(r).reduce((a, b) => a + (b ?? 0), 0);
      return { stratum, phase: phase as PhaseOrd, members: here, empty, inList: inList[k], fitting: fitting[k], reasons: r, bothReasons: sum > inList[k] };
    }),
  }));
  const total = 28 - cannot;
  return { climate, rows, filled, total, free: total - filled, cannot, unplaced };
}
