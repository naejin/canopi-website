/** @jsxImportSource preact */
// Warnings and Balance (v14 boards MainMore, Many, ManyDesk, Kumasi; spec A12, A13, R1). Things to keep
// in mind, in words: nothing is removed, nothing hidden, nothing asks (owner rows "Inform, don't block",
// "Warn, don't remove").
// - Warnings, 40 plants or fewer (MainMore): "Warnings N", N its groups: the plants leaving their climate
//   range by 2041–2070 (and those near its edge then), Very toxic, Toxic, Mildly toxic, recorded invasive
//   in the chosen country, a shared pest or disease. Its "See 2041–2070" is the period tabs' (PP-E).
// - Warnings and fit, past 40 plants (Many, ManyDesk; F29): the palette in lines that add up (weigh.ts
//   fitGroups: fits, needs a second look, outside its range, not checked; a line at 0 hidden), each
//   closed, opening to its plants; the second look to its reasons; Mildly toxic its own line (R1).
//   No "Tick these" (pf-e's, A15).
// - Balance (MainMore): one family, the water line ("Water needs" where the summer is dry), the soil pH
//   hints (R3). Elsewhere the water line is its own card, "Water use" (Kumasi).
// Lists follow the size rule (A14): every name at 40 plants or fewer and 12 or fewer, else MoreList.
import { useMemo, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { Flag, Line, PlantId, PlantVerdict, Taxon, WeighLine } from '../../../../lib/consortium/index.ts';
import { fitGroups, weighLines } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { nameOf, P, T } from '../../strings.ts';
import { countryName, listOf, num } from '../kit/names.ts';
import { commaList } from '../kit/chart.tsx';
import { MoreList } from '../kit/more.tsx';
import { SIZE_PALETTE } from './Years.tsx';

const LATER = '2041-2070';
const CLIMATE = new Set(['cold', 'mild', 'cool', 'summer', 'hot', 'dry']);
const has = (key: string): boolean => T(key) !== key;
const names = (ids: readonly PlantId[], byId: Map<PlantId, Taxon>): string[] => ids.flatMap((id) => { const t = byId.get(id); return t ? [nameOf(t)] : []; });
const named = (ids: readonly PlantId[], byId: Map<PlantId, Taxon>): string => commaList(ids.flatMap((id) => { const t = byId.get(id); return t ? [nameOf(t)] : []; }));

// Names under the size rule: all as a sentence, or the count cell (a block: never inside a <p>).
const inline = (ids: readonly PlantId[], size: number): boolean => size <= SIZE_PALETTE && ids.length <= 12;
function Names({ ids, byId, size, closed = 3 }: { ids: readonly PlantId[]; byId: Map<PlantId, Taxon>; size: number; closed?: number }) {
  if (inline(ids, size)) return <>{named(ids, byId)}</>;
  return <MoreList items={ids} keyOf={(id) => id} paletteSize={size} closed={closed} class="ct-cell-names" render={(id) => { const t = byId.get(id); return t ? nameOf(t) : id; }} />;
}

// ---- Warnings, 40 plants or fewer ----

export interface WarningGroup { key: string; head: string; body: ComponentChildren }
// The groups of the small Warnings card (also counted by "Further down this page: Warnings (N)").
export function warningGroups(members: readonly Taxon[], flags: readonly Flag[], now: ReadonlyMap<PlantId, PlantVerdict> | null, later: ReadonlyMap<PlantId, PlantVerdict> | null, country: string | null): WarningGroup[] {
  const byId = new Map(members.map((t) => [t.id, t]));
  const ids = new Set(members.map((t) => t.id));
  const out: WarningGroup[] = [];
  if (later && now) {
    const leave = members.filter((t) => later.get(t.id)?.level === 'outside' && now.get(t.id)?.level !== 'outside').map((t) => t.id);
    const edge = members.filter((t) => { const v = later.get(t.id); return v?.level === 'look' && !!v.limiting && CLIMATE.has(v.limiting.factor); }).map((t) => t.id);
    if (leave.length) out.push({ key: 'leave', head: P('palette.warningsLeave', leave.length, { period: '2041–2070' }), body: <>{named(leave, byId)}.{edge.length > 0 && <> {T('palette.warningsEdgeThen', { names: named(edge, byId) })}</>}</> });
  }
  const tox = (level: string) => members.filter((t) => flags.some((f) => f.id === t.id && f.kind === 'toxicity' && f.level === level)).map((t) => t.id);
  for (const [k, level] of [['severe', 'Severe'], ['moderate', 'Moderate'], ['slight', 'Slight']] as const) {
    const list = tox(level);
    if (list.length) out.push({ key: k, head: T(`palette.warningsTox_${k}`), body: named(list, byId) });
  }
  const inv = members.filter((t) => flags.some((f) => f.id === t.id && f.kind === 'invasive')).map((t) => t.id);
  if (inv.length) out.push({ key: 'invasive', head: T('palette.warningsInvasive', { country: countryName(country ?? '') }), body: named(inv, byId) });
  // A shared pest or disease between members, by agent (conflicts.ts: shared_pest, alternate_host).
  const agents = new Map<string, Set<PlantId>>();
  for (const f of flags) {
    if (f.kind !== 'conflict' || (f.type !== 'shared_pest' && f.type !== 'alternate_host') || !ids.has(f.id)) continue;
    const a = f.agent ?? '';
    const s = agents.get(a) ?? new Set<PlantId>();
    s.add(f.id);
    if (f.other && ids.has(f.other)) s.add(f.other);
    agents.set(a, s);
  }
  if (agents.size) out.push({ key: 'shared', head: T('palette.warningsShared'), body: [...agents].map(([a, s]) => <span key={a} class="ct-warn-line">{a ? T('palette.warningsSharedAgent', { names: listOf(names([...s], byId)), agent: a }) : T('palette.warningsSharedNone', { names: listOf(names([...s], byId)) })} </span>) });
  return out;
}

export function Warnings({ groups }: { groups: WarningGroup[] }) {
  if (!groups.length) return null;
  return (
    <section class="ct-chart ct-warnings" id="ct-warnings" aria-labelledby="ct-warnings-h">
      <h3 id="ct-warnings-h">{T('palette.warningsTitle')} <span class="ct-next-count">{num(groups.length)}</span></h3>
      {groups.map((g) => (
        <div key={g.key} class="ct-warn-group" data-warn={g.key}>
          <h4>{g.head}</h4>
          <p>{g.body}</p>
        </div>
      ))}
    </section>
  );
}

// ---- Warnings and fit, past 40 plants ----

// A closed line: its words and count as a button, opening to `children`.
function Line_({ head, n, children, cls = '' }: { head: string; n: number; children: ComponentChildren; cls?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li class={`ct-fit-line ${cls}`}>
      <button type="button" class="ct-job-row" aria-expanded={open} onClick={() => setOpen(!open)}><strong>{head}</strong> <span class="ct-grid-count">{num(n)}</span></button>
      {open && <div class="ct-job-open">{children}</div>}
    </li>
  );
}

export function WarningsAndFit({ members, verdicts, flags, country }: { members: readonly Taxon[]; verdicts: ReadonlyMap<PlantId, PlantVerdict> | null; flags: readonly Flag[]; country: string | null }) {
  const g = useMemo(() => fitGroups(members, verdicts, flags), [members, verdicts, flags]);
  const byId = useMemo(() => new Map(members.map((t) => [t.id, t])), [members]);
  const size = members.length;
  const lines = ([['palette.warningsFits', g.fits], ['palette.warningsLook', g.look], ['palette.warningsOutside', g.outside], ['palette.warningsUnknown', g.unknown]] as const).filter(([, ids]) => ids.length);
  const r = g.reasons;
  const tox = [...r.severe, ...r.moderate];
  return (
    <section class="ct-chart ct-warnings" id="ct-warnings" aria-labelledby="ct-warnings-h">
      <h3 id="ct-warnings-h">{T('palette.warningsFitTitle')}</h3>
      <p class="ct-chart-intro">{P('palette.warningsIntro', lines.length, { m: num(size) })}</p>
      <ul class="ct-jobs-list">
        {lines.map(([key, ids]) => (
          <Line_ key={key} head={T(key)} n={ids.length}>
            {key === 'palette.warningsLook' ? (
              <>
                <ul class="ct-jobs-list">
                  {r.edge.length > 0 && <Line_ head={T('palette.warningsEdge')} n={r.edge.length}><Names ids={r.edge} byId={byId} size={size} closed={10} /></Line_>}
                  {tox.length > 0 && (
                    <Line_ head={T('palette.warningsToxic')} n={tox.length}>
                      {r.severe.length > 0 && <p>{T('palette.warningsVery', { n: num(r.severe.length) })} {named(r.severe, byId)}.</p>}
                      {r.moderate.length > 0 && <div>{T('palette.warningsTox', { n: num(r.moderate.length) })} <Names ids={r.moderate} byId={byId} size={size} closed={10} /></div>}
                    </Line_>
                  )}
                  {r.invasive.length > 0 && <Line_ head={T('palette.warningsInvasive', { country: countryName(country ?? '') })} n={r.invasive.length}><Names ids={r.invasive} byId={byId} size={size} closed={10} /></Line_>}
                  {r.misfit.length > 0 && <Line_ head={T('palette.warningsMisfit')} n={r.misfit.length}><Names ids={r.misfit} byId={byId} size={size} closed={10} /></Line_>}
                  {r.clash.length > 0 && <Line_ head={T('palette.warningsClash')} n={r.clash.length}><Names ids={r.clash} byId={byId} size={size} closed={10} /></Line_>}
                </ul>
                <p class="ct-chart-note">{P('palette.warningsReasons', g.several, { r: num(g.reasonCount), l: num(g.look.length) })}</p>
              </>
            ) : <Names ids={ids} byId={byId} size={size} closed={10} />}
          </Line_>
        ))}
        {g.mild.length > 0 && (
          <Line_ head={T('palette.warningsTox_slight')} n={g.mild.length} cls="ct-fit-mild">
            <p>{P('palette.warningsMild', g.mildFits, { n: num(g.mild.length) })}</p>
            <Names ids={g.mild} byId={byId} size={size} closed={10} />
          </Line_>
        )}
      </ul>
    </section>
  );
}

// ---- Balance ----

const K = (l: Line): string => l.key.split('.').pop() ?? '';
const vars = (l: Line) => Object.fromEntries(Object.entries(l.vars).map(([k, v]) => [k, typeof v === 'number' ? num(v) : v]));

function BalanceItem({ w, byId, size }: { w: WeighLine; byId: Map<PlantId, Taxon>; size: number }) {
  const l = w.line, said = K(l), v = vars(l);
  const est = l.vars.term === 'estimate' && <span class="ct-weigh-est">{T('estimate.short')}</span>;
  if (w.kind === 'family') {
    const fam = String(l.vars.family), words = `palette.balance.familyWords.${fam}`, hint = `palette.balance.familyHint.${fam}`;
    return (
      <li data-weigh="family" data-family={fam}>
        <strong>{has(words) ? T('palette.balance.family', { ...v, words: T(words) }) : T('plants.weigh.family', v)}</strong>{est}
        {inline(w.members, size)
          ? <p><Names ids={w.members} byId={byId} size={size} />. {has(hint) ? T(hint) : T('plants.weigh.familyHint')}</p>
          : <><Names ids={w.members} byId={byId} size={size} /><p>{has(hint) ? T(hint) : T('plants.weigh.familyHint')}</p></>}
      </li>
    );
  }
  if (w.kind === 'soil') {
    return <li data-weigh="soil"><strong>{P('palette.balance.soilHints', Number(l.vars.n))}</strong>{est}{inline(w.members, size) ? <p><Names ids={w.members} byId={byId} size={size} /></p> : <Names ids={w.members} byId={byId} size={size} />}</li>;
  }
  const missing = Number(l.vars.missing ?? 0);
  if (said === 'waterDrySummer') {
    return (
      <li data-weigh="water">
        <strong>{T('palette.balance.waterDrySummer', v)}</strong>{est}
        <p>{T('palette.balance.waterRecorded', v)}{missing > 0 && <> {P('palette.balance.notRecordedNamed', missing, { names: named(w.members, byId) })}</>}</p>
      </li>
    );
  }
  const cut = said === 'waterMix' ? Number(l.vars.regular) : 0;
  return (
    <li data-weigh="water">
      <strong>{said === 'missing' ? P('plants.weigh.missing', missing) : T(`plants.weigh.${said}`, v)}</strong>{est}
      {cut > 0 && <p>{T('plants.weigh.regular', { names: named(w.members.slice(0, cut), byId) })} {T('plants.weigh.dryLoving', { names: named(w.members.slice(cut), byId) })} {T('plants.weigh.waterMixHint')}</p>}
      {said === 'waterMix' && missing > 0 && <p class="ct-muted">{P('plants.weigh.missing', missing)}</p>}
    </li>
  );
}

// "Water use" (Kumasi): the recorded use, high, medium, low, then the plants not recorded.
function WaterUse({ w, byId }: { w: WeighLine; byId: Map<PlantId, Taxon> }) {
  const n = (k: string) => Number(w.line.vars[k] ?? 0);
  const [hi, me, lo, mi] = [n('high'), n('medium'), n('low'), n('missing')];
  const cuts = [0, hi, hi + me, hi + me + lo, hi + me + lo + mi];
  const part = (i: number) => named(w.members.slice(cuts[i], cuts[i + 1]), byId);
  return (
    <section class="ct-chart ct-balance" aria-labelledby="ct-water-h">
      <h3 id="ct-water-h">{T('palette.balance.waterUseTitle')}</h3>
      <p class="ct-chart-intro">{T('palette.balance.waterUseLead')}</p>
      {hi > 0 && <p>{T('palette.balance.useHigh', { names: part(0) })}</p>}
      {me > 0 && <p>{T('palette.balance.useMedium', { names: part(1) })}</p>}
      {lo > 0 && <p>{T('palette.balance.useLow', { names: part(2) })}</p>}
      {mi > 0 && <p>{P('palette.balance.useMissing', mi, { names: part(3) })}</p>}
    </section>
  );
}

export function Balance({ members, pending, unchecked }: { members: readonly Taxon[]; pending: boolean; unchecked: number }) {
  const { inputs, period } = store.verdictContext.value;
  const verdicts = store.memberVerdicts.value;
  const out = useMemo(() => weighLines(members, { inputs, period }, { pending, unchecked, verdicts }), [members, pending, unchecked, inputs, period, verdicts]);
  const byId = useMemo(() => new Map(members.map((t) => [t.id, t])), [members]);
  if (out !== 'checking' && !out.length && !unchecked) return null;
  const use = out === 'checking' ? null : out.find((w) => K(w.line) === 'waterUse') ?? null;
  const rest = out === 'checking' ? [] : out.filter((w) => w !== use);
  return (
    <>
      {(out === 'checking' || rest.length > 0 || unchecked > 0) && (
        <section class="ct-chart ct-balance" id="ct-balance" aria-labelledby="ct-balance-h">
          <h3 id="ct-balance-h">{T('palette.balance.title')} <span class="ct-balance-sub">{T('palette.balance.lead')}</span></h3>
          {out === 'checking' ? <p>{T('plants.weigh.checking')}</p> : (
            <>
              {unchecked > 0 && <p>{P('plants.weigh.unchecked', unchecked)}</p>}
              {rest.length > 0 && <ul class="ct-balance-lines">{rest.map((w) => <BalanceItem key={`${w.kind}:${w.kind === 'family' ? w.line.vars.family : K(w.line)}`} w={w} byId={byId} size={members.length} />)}</ul>}
            </>
          )}
        </section>
      )}
      {use && <WaterUse w={use} byId={byId} />}
    </>
  );
}
