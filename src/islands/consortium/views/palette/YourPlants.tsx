/** @jsxImportSource preact */
// Your plants (boards PaletteMore, Recife, Many, ManyDesk; v14 pf-e): up to 40 plants the small form
// (views/plants/Small.tsx: every row, warned first, each opening the plant), past 40 the compact list or
// table (views/plants/Many.tsx: search, sort, group, ticks, Remove with Undo). The borrowed lists are
// named once above the rows (A9). Nothing at 0 plants: the Next step's empty card offers the ways in.
// Its rows come from Palette (core yourPlants, useMemo there, never in the store: first run), which
// counts Things to weigh's plants not checked from them.
import type { PlantRow } from '../../../../lib/consortium/index.ts';
import { NEAREST_LISTS } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import { zoneName } from '../kit/names.ts';
import { SIZE_PALETTE } from '../kit/chart.tsx';
import { SmallPlants } from '../plants/Small.tsx';
import { ManyPlants } from '../plants/Many.tsx';

// The borrowed lists named once for the palette (A9): a climate with no list of its own takes its
// plants from the nearest lists, each plant then marked "estimate" on its row.
function BorrowedLists() {
  const zone = store.climate.value, curated = store.curatedClimates.value;
  if (!zone || curated.includes(zone) || !NEAREST_LISTS[zone]) return null;
  return (
    <p class="ct-muted" data-borrowed-lists>
      {T('estimate.borrowed', { climate: zoneName(zone), lists: NEAREST_LISTS[zone].filter((z) => curated.includes(z)).map(zoneName).join(', ') })}
    </p>
  );
}

export function YourPlants({ rows }: { rows: readonly PlantRow[] }) {
  if (!rows.length) return null;
  if (store.memberTaxa.value.length > SIZE_PALETTE) return <ManyPlants rows={rows} />;
  return <SmallPlants rows={rows}><BorrowedLists /></SmallPlants>;
}
