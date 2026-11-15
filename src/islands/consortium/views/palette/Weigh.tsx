/** @jsxImportSource preact */
// Things to weigh (inventory P39, board MainMore "Balance: things to weigh, not holes"; PP-B stream b3):
// one family holding a large share of the palette and the water needs, from core weigh.ts, in words.
// Things to keep in mind, never holes or verdicts: nothing is removed and nothing asks. A check with too
// few records says "not enough to judge"; the plants with no record are counted aloud ("that is not a
// pass"). "Checking" while a list loads; nothing at 0 plants. On a borrowed list each line says
// "estimate". Derived here (useMemo), never in the store (first run).
import { useMemo } from 'preact/hooks';
import type { Line, PlantId, Taxon, WeighLine } from '../../../../lib/consortium/index.ts';
import { moreLine, waterNeed, weighLines } from '../../../../lib/consortium/index.ts';
import { nameOf, T } from '../../strings.ts';
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
  const wet = w.kind === 'water' ? w.members.filter((id) => { const t = byId.get(id); return t && waterNeed(t) === 'wet'; }) : [];
  const dry = w.kind === 'water' ? w.members.filter((id) => !wet.includes(id)) : [];
  return (
    <li data-weigh={w.kind}>
      <strong>{weigh(said, vars)}</strong>
      {vars.term === 'estimate' && <span class="ct-weigh-est">{T('estimate.short')}</span>}
      {w.kind === 'family' && <p>{names(w.members, byId)}. {weigh('familyHint')}</p>}
      {wet.length > 0 && <p>{weigh('thirsty', { names: names(wet, byId) })} {weigh('dryLoving', { names: names(dry, byId) })} {weigh('waterMixHint')}</p>}
      {w.kind === 'water' && said !== 'waterFew' && Number(vars.missing) > 0 && <p class="ct-muted">{weigh('missing', { missing: vars.missing })}</p>}
    </li>
  );
}

export function Weigh({ members, pending }: { members: readonly Taxon[]; pending: boolean }) {
  const out = useMemo(() => weighLines(members, { pending }), [members, pending]);
  const byId = useMemo(() => new Map(members.map((t) => [t.id, t])), [members]);
  if (out !== 'checking' && !out.length) return null;
  return (
    <section class="ct-weigh" aria-labelledby="ct-weigh-t">
      <h3 id="ct-weigh-t">{weigh('title')}</h3>
      <p class="ct-muted">{weigh('lead')}</p>
      {out === 'checking' ? <p>{weigh('checking')}</p>
        : <ul class="ct-weigh-lines">{out.map((w) => <Item key={w.line.key} w={w} byId={byId} />)}</ul>}
    </section>
  );
}
