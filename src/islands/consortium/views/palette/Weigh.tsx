/** @jsxImportSource preact */
// Things to weigh (inventory P39, board MainMore "Balance: things to weigh, not holes"; PP-B stream b3):
// one family holding a large share of the palette and the water needs, from core weigh.ts, in words.
// Things to keep in mind, never holes or verdicts: nothing is removed and nothing asks. A check with too
// few records says "not enough to judge"; the plants with no water need recorded are counted aloud (under
// a mixed-needs line, or on a line of their own when there is no other water line), and so are the
// plants not checked (a list unread, on none of this climate's lists: the rows Your plants shows for
// them, counted by Palette from the same yourPlants rows). "Checking" while a list loads; nothing
// at 0 plants. On a borrowed list each line says "estimate". Derived here (useMemo), never in the store
// (first run).
import { useMemo } from 'preact/hooks';
import type { Line, PlantId, Taxon, WeighLine } from '../../../../lib/consortium/index.ts';
import { moreLine, weighLines } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { nameOf, P, T } from '../../strings.ts';
import { say } from '../kit/fit.tsx';
import { listOf, num } from '../kit/names.ts';

// Plants named on a line before "+ N more".
const NAMES_MAX = 8;

// A weigh Line's words: its key is consortium.plants.weigh.<name>; numbers in the page language.
const nameOfLine = (l: Line): string => l.key.split('.').pop() ?? '';
const weigh = (name: string, vars: Line['vars'] = {}): string => T(`plants.weigh.${name}`,
  Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, typeof v === 'number' ? num(v) : v])));

function names(ids: readonly PlantId[], byId: Map<PlantId, Taxon>): string {
  const list = ids.slice(0, NAMES_MAX).map((id) => byId.get(id)).filter((t): t is Taxon => !!t).map(nameOf);
  return ids.length > NAMES_MAX ? `${listOf(list)} ${say(moreLine(ids.length - NAMES_MAX))}` : listOf(list);
}

function Item({ w, byId }: { w: WeighLine; byId: Map<PlantId, Taxon> }) {
  const { vars } = w.line, said = nameOfLine(w.line);
  // A water mix's members: the plants needing regular water (vars.regular of them), then the dry-loving.
  const cut = said === 'waterMix' ? Number(vars.regular) : 0;
  const missing = said === 'waterMix' ? Number(vars.missing) : 0;
  return (
    <li data-weigh={w.kind} data-family={w.kind === 'family' ? String(vars.family) : undefined}>
      <strong>{said === 'missing' ? P('plants.weigh.missing', Number(vars.missing)) : weigh(said, vars)}</strong>
      {vars.term === 'estimate' && <span class="ct-weigh-est">{T('estimate.short')}</span>}
      {w.kind === 'family' && <p>{names(w.members, byId)}. {weigh('familyHint')}</p>}
      {cut > 0 && <p>{weigh('regular', { names: names(w.members.slice(0, cut), byId) })} {weigh('dryLoving', { names: names(w.members.slice(cut), byId) })} {weigh('waterMixHint')}</p>}
      {missing > 0 && <p class="ct-muted">{P('plants.weigh.missing', missing)}</p>}
    </li>
  );
}

export function Weigh({ members, pending, unchecked }: { members: readonly Taxon[]; pending: boolean; unchecked: number }) {
  const { lookup, period } = store.verdictContext.value;
  const out = useMemo(() => weighLines(members, { lookup, period }, { pending, unchecked }), [members, pending, unchecked, lookup, period]);
  const byId = useMemo(() => new Map(members.map((t) => [t.id, t])), [members]);
  // Nothing to weigh and every plant checked: no section (no all-clear line, owner 2026-11-15). Plants
  // not checked are said even with no line, as the check did not cover the whole palette.
  if (out !== 'checking' && !out.length && !unchecked) return null;
  return (
    <section class="ct-weigh" aria-labelledby="ct-weigh-t">
      <h3 id="ct-weigh-t">{weigh('title')}</h3>
      <p class="ct-muted">{weigh('lead')}</p>
      {out === 'checking' ? <p>{weigh('checking')}</p> : (
        <>
          {unchecked > 0 && <p>{P('plants.weigh.unchecked', unchecked)}</p>}
          {out.length > 0 && <ul class="ct-weigh-lines">{out.map((w) => <Item key={`${w.kind}:${w.kind === 'family' ? w.line.vars.family : ''}`} w={w} byId={byId} />)}</ul>}
        </>
      )}
    </section>
  );
}
