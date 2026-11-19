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
//   Each reason ends with "Tick these N" (pf-e, A15) beside its "+ N more", saying where it ticked.
// - Balance (MainMore): one family, the water line ("Water needs" where the summer is dry), the soil pH
//   hints (R3). Elsewhere the water line is its own card, "Water use" (Kumasi).
// Every list of names goes through kit/chart.tsx Names (the size rule A14: every name at 40 plants or
// fewer and 12 or fewer, else the count cell; review R2, C1): the boards' plain list ("Toxic: Almond,
// Licorice"), "and" only where the names sit inside a sentence (`and`: "Olive and Almond share
// Xylella", "Silk oak and Napier grass sit between", the outside-and-toxic sentence; c2 C1).
import { saidFor, tickAndShow } from '../plants/state.ts';
import { useMemo, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { Flag, Line, PlantId, PlantVerdict, Taxon, WeighLine } from '../../../../lib/consortium/index.ts';
import { fitGroups, jobsOf, leaveGroups, mildExamples, weighLines } from '../../../../lib/consortium/index.ts';
import * as store from '../../store.ts';
import { nameOf, P, pageLang, T } from '../../strings.ts';
import { collatorFor, countryName, num } from '../kit/names.ts';
import { inlineNames, Names, ToxMark } from '../kit/chart.tsx';

const has = (key: string): boolean => T(key) !== key;
type NameOf = (id: PlantId) => string;
const nameIn = (byId: Map<PlantId, Taxon>): NameOf => (id) => { const t = byId.get(id); return t ? nameOf(t) : id; };

// ---- Warnings, 40 plants or fewer ----

// A chip's icon (board MainMore, BC15): the thermometer on the range line, the triangle on toxicity, the
// link on a shared pest or disease; decorative, the chip's words beside it.
const ICONS: Record<string, ComponentChildren> = {
  leave: <><path d="M8.5 12V4a1.5 1.5 0 0 1 3 0v8" /><circle cx="10" cy="14.5" r="2.8" /></>,
  shared: <><path d="M8.5 11.5l3-3" /><path d="M9 6.5l1.5-1.5a2.8 2.8 0 0 1 4 4L13 10.5M11 13.5l-1.5 1.5a2.8 2.8 0 0 1-4-4L7 9.5" /></>,
};
const ChipIcon = ({ k }: { k: string }) => k === 'severe' || k === 'moderate' || k === 'slight'
  ? <ToxMark tox={k} decorative />
  : ICONS[k] ? <svg class="ct-chip-icon" data-warn={k} viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">{ICONS[k]}</svg> : null;

export interface WarningGroup { key: string; head: string; body: ComponentChildren }
// The groups of the small Warnings card (also counted by "Further down this page: Warnings (N)").
export function warningGroups(members: readonly Taxon[], flags: readonly Flag[], now: ReadonlyMap<PlantId, PlantVerdict> | null, later: ReadonlyMap<PlantId, PlantVerdict> | null, country: string | null): WarningGroup[] {
  const byId = new Map(members.map((t) => [t.id, t])), name = nameIn(byId), size = members.length;
  const ids = new Set(members.map((t) => t.id));
  const out: WarningGroup[] = [];
  const names = (list: readonly PlantId[]) => <Names ids={list} name={name} size={size} />;
  const { leave, edge } = leaveGroups(members, now, later);
  if (leave.length) {
    out.push({ key: 'leave', head: P('palette.warningsLeave', leave.length, { period: '2041–2070' }), body: <>
      <Names ids={leave} name={name} size={size} text={(w) => `${w}.`} />
      {edge.length > 0 && <> <Names ids={edge} name={name} size={size} text={(w) => T('palette.warningsEdgeThen', { names: w })} lead={<strong>{T('palette.warningsEdge')}</strong>} /></>}
    </> });
  }
  const tox = (level: string) => members.filter((t) => flags.some((f) => f.id === t.id && f.kind === 'toxicity' && f.level === level)).map((t) => t.id);
  for (const [k, level] of [['severe', 'Severe'], ['moderate', 'Moderate'], ['slight', 'Slight']] as const) {
    const list = tox(level);
    if (list.length) out.push({ key: k, head: T(`palette.warningsTox_${k}`), body: names(list) });
  }
  const inv = members.filter((t) => flags.some((f) => f.id === t.id && f.kind === 'invasive')).map((t) => t.id);
  if (inv.length) out.push({ key: 'invasive', head: T('palette.warningsInvasive', { country: countryName(country ?? '') }), body: names(inv) });
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
  if (agents.size) out.push({ key: 'shared', head: T('palette.warningsShared'), body: [...agents].map(([a, s]) => <span key={a} class="ct-warn-line"><Names ids={[...s]} name={name} size={size} and text={(w) => (a ? T('palette.warningsSharedAgent', { names: w, agent: a }) : T('palette.warningsSharedNone', { names: w }))} lead={a ? <strong>{a}: </strong> : null} /> </span>) });
  return out;
}

export function Warnings({ groups }: { groups: WarningGroup[] }) {
  if (!groups.length) return null;
  return (
    <section class="ct-chart ct-warnings ct-side-card" id="ct-warnings" aria-labelledby="ct-warnings-h">
      <h3 id="ct-warnings-h">{T('palette.warningsTitle')} <span class="ct-next-count">{num(groups.length)}</span></h3>
      {groups.map((g) => (
        <div key={g.key} class="ct-warn-group" data-warn={g.key}>
          <h4><ChipIcon k={g.key} />{g.head}</h4>
          <div class="ct-warn-body">{g.body}</div>
        </div>
      ))}
    </section>
  );
}

// ---- Warnings and fit, past 40 plants ----

// A closed line: its words and count as a button, opening to `children`; `note` stays under it closed.
function Line_({ head, n, children, note, cls = '' }: { head: string; n: number; children: ComponentChildren; note?: ComponentChildren; cls?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <li class={`ct-fit-line ${cls}`}>
      <button type="button" class="ct-job-row" aria-expanded={open} onClick={() => setOpen(!open)}><strong>{head}</strong> <span class="ct-grid-count">{num(n)}</span></button>
      {note}
      {open && <div class="ct-job-open">{children}</div>}
    </li>
  );
}

// The second look's reasons past the edge, toxicity and invasive lines, each its words (weigh.ts
// WarnReason: the room or plot, a serious clash).
const REASON_WORDS = [['misfit', 'palette.warningsMisfit'], ['clash', 'palette.warningsClash']] as const;
const OPEN_NAMES = 10; // an open list's names before "+ N more" (BC4)
// "Tick these N" (board Many, A15): ticks a reason's plants in Your plants, ready for Remove (one Undo
// there); nothing is removed here. Your plants may be far down the page, so the rows' groups open and
// the focus goes to the tick bar's Remove (views/plants/state.ts tickAndShow, R2), and the result is
// said here too (BC10) in word-map's words ("42 ticked", as the tick bar says it), on the reason whose
// button was pressed only, until the ticks change (state.ts saidFor; round 2 C3). No confirm step.
function TickThese({ ids, k }: { ids: readonly PlantId[]; k: string }) {
  return (
    <>
      <button type="button" class="ct-tick-these" onClick={() => tickAndShow(ids, k)}>{T('many.tickThese', { n: num(ids.length) })}</button>
      <p class="ct-tick-said" role="status">{saidFor(k) && P('many.ticked', ids.length)}</p>
    </>
  );
}
// A reason's names, then its actions on one row (board Many): "+ N more" (the count cell's, MoreList)
// beside "Tick these N", both 44 px pills; the status under them. k: the reason, for its status.
function Reason_({ children, ids, k }: { children: ComponentChildren; ids: readonly PlantId[]; k: string }) {
  return <div class="ct-reason">{children}<TickThese ids={ids} k={k} /></div>;
}

export function WarningsAndFit({ members, verdicts, flags, country }: { members: readonly Taxon[]; verdicts: ReadonlyMap<PlantId, PlantVerdict> | null; flags: readonly Flag[]; country: string | null }) {
  const g = useMemo(() => fitGroups(members, verdicts, flags), [members, verdicts, flags]);
  const byId = useMemo(() => new Map(members.map((t) => [t.id, t])), [members]);
  const name = nameIn(byId), size = members.length;
  const lines = ([['palette.warningsFits', g.fits], ['palette.warningsLook', g.look], ['palette.warningsOutside', g.outside], ['palette.warningsUnknown', g.unknown]] as const).filter(([, ids]) => ids.length);
  const r = g.reasons;
  const tox = r.severe.length + r.moderate.length;
  const list = (ids: readonly PlantId[], closed = OPEN_NAMES) => <Names ids={ids} name={name} size={size} closed={closed} />;
  // Mildly toxic: its first three by name, "many are common foods" when most feed you (weigh.ts
  // mildExamples; BC14, round 2 C9).
  const mildEx = useMemo(() => mildExamples(g, members, name, collatorFor(pageLang()).compare), [g, members]);
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
                  {r.edge.length > 0 && <Line_ head={T('palette.warningsEdge')} n={r.edge.length}><Reason_ ids={r.edge} k="edge">{list(r.edge)}</Reason_></Line_>}
                  {tox > 0 && (
                    <Line_ head={T('palette.warningsToxic')} n={tox}>
                      {/* One paragraph, the labels bold (board Many): "Very toxic, 5: …. Toxic, 37: …". */}
                      <Reason_ ids={[...r.severe, ...r.moderate]} k="toxic">
                        <div class="ct-reason-text">
                          {r.severe.length > 0 && <><strong>{T('palette.warningsVery', { n: num(r.severe.length) })}</strong> {list(r.severe, Math.min(OPEN_NAMES, r.severe.length))}{r.moderate.length > 0 && '. '}</>}
                          {r.moderate.length > 0 && <><strong>{T('palette.warningsTox', { n: num(r.moderate.length) })}</strong> {list(r.moderate, OPEN_NAMES - Math.min(OPEN_NAMES - 1, r.severe.length))}</>}
                        </div>
                      </Reason_>
                    </Line_>
                  )}
                  {r.invasive.length > 0 && <Line_ head={T('palette.warningsInvasive', { country: countryName(country ?? '') })} n={r.invasive.length}><Reason_ ids={r.invasive} k="invasive">{list(r.invasive)}</Reason_></Line_>}
                  {REASON_WORDS.filter(([k]) => r[k].length > 0).map(([k, words]) => <Line_ key={k} head={T(words)} n={r[k].length}><Reason_ ids={r[k]} k={k}>{list(r[k])}</Reason_></Line_>)}
                </ul>
                {g.several > 0 && <p class="ct-chart-note">{P('palette.warningsReasons', g.reasonCount, { plants: P('palette.warningsReasonsPlants', g.look.length), carry: P('palette.warningsReasonsCarry', g.several) })}</p>}
                {g.outsideToxic.length > 0 && <div class="ct-chart-note"><Names ids={g.outsideToxic} name={name} size={size} few={3} and text={(w) => P('palette.warningsOutsideToxic', g.outsideToxic.length, { names: w })} lead={<p>{P('palette.warningsOutsideToxicMany', g.outsideToxic.length)}</p>} /></div>}
              </>
            ) : list(ids)}
          </Line_>
        ))}
        {g.mild.length > 0 && (
          <Line_ head={T('palette.warningsTox_slight')} n={g.mild.length} cls="ct-fit-mild" note={<p class="ct-fit-note">{mildEx.foods ? <Names ids={mildEx.ids} name={name} size={size} few={3} text={(w) => T('palette.warningsMildFoods', { names: w })} /> : T('palette.warningsMildLead')} {P('palette.warningsMild', g.mildFits, { n: num(g.mild.length) })}</p>}>
            {list(g.mild)}
          </Line_>
        )}
      </ul>
    </section>
  );
}

// ---- Balance ----

const K = (l: Line): string => l.key.split('.').pop() ?? '';
const vars = (l: Line) => Object.fromEntries(Object.entries(l.vars).map(([k, v]) => [k, typeof v === 'number' ? num(v) : v]));
// One card head for every Balance line and the Water use card: its words and, on a borrowed list, the
// estimate mark (R10), a space before it in the text so a heading reads "Water use estimate" (round 2 R6).
const Est = ({ l }: { l: Line }) => (l.vars.term === 'estimate' ? <>{' '}<span class="ct-weigh-est">{T('estimate.short')}</span></> : null);

// The plants with no water need recorded, named (BC17): "1 not recorded (Myrtle): that is not a pass.",
// or past the size rule "86 not recorded:", the count cell, "That is not a pass.".
function NotRecorded({ ids, name, size }: { ids: readonly PlantId[]; name: NameOf; size: number }) {
  if (!ids.length) return null;
  return inlineNames(ids.length, size)
    ? <p><Names ids={ids} name={name} size={size} text={(w) => P('palette.balance.notRecordedNamed', ids.length, { names: w })} /></p>
    : <div><strong>{P('palette.balance.useMissing', ids.length)}</strong><Names ids={ids} name={name} size={size} /><p>{T('palette.balance.notAPass')}</p></div>;
}
// A labelled group of names: "**A medium amount:** Silk oak, Napiergrass and Fig." or its count cell.
function Group({ label, ids, name, size }: { label: string; ids: readonly PlantId[]; name: NameOf; size: number }) {
  if (!ids.length) return null;
  return inlineNames(ids.length, size)
    ? <p><strong>{label}</strong> <Names ids={ids} name={name} size={size} text={(w) => `${w}.`} /></p>
    : <div><strong>{label}</strong><Names ids={ids} name={name} size={size} /></div>;
}

function BalanceItem({ w, name, size }: { w: WeighLine; name: NameOf; size: number }) {
  const l = w.line, said = K(l), v = vars(l);
  if (w.kind === 'family') {
    // Board MainMore: the hint ends with "Find a soil feeder of another family" (M24), Find narrowed to
    // the plants that feed the soil and are not of that family, for a family the words name.
    const fam = String(l.vars.family), words = `palette.balance.familyWords.${fam}`, hint = `palette.balance.familyHint.${fam}`;
    const hintText = has(hint) ? T(hint) : T('plants.weigh.familyHint');
    const findKey = `palette.balance.familyFind.${fam}`;
    const find = has(findKey) && (
      <>{' '}<button type="button" class="link-button" data-weigh-find="" onClick={() => store.openFind({ job: 'feeds_soil', hole: null, fits: (t) => t.family !== fam && jobsOf(t).includes('feeds_soil'), title: T(findKey) })}>{T(findKey)}</button></>
    );
    return (
      <li data-weigh="family" data-family={fam}>
        <strong>{has(words) ? T('palette.balance.family', { ...v, words: T(words) }) : T('plants.weigh.family', v)}</strong><Est l={l} />
        {inlineNames(w.members.length, size)
          ? <p><Names ids={w.members} name={name} size={size} text={(n) => `${n}. ${hintText}`} />{find}</p>
          : <><Names ids={w.members} name={name} size={size} /><p>{hintText}{find}</p></>}
      </li>
    );
  }
  if (w.kind === 'soil') {
    return <li data-weigh="soil"><strong>{P('palette.balance.soilHints', Number(l.vars.n))}</strong><Est l={l} /><div><Names ids={w.members} name={name} size={size} /></div></li>;
  }
  const missing = Number(l.vars.missing ?? 0);
  const none = w.members.slice(w.members.length - missing);
  if (said === 'waterDrySummer') {
    return (
      <li data-weigh="water">
        <strong>{T('palette.balance.waterDrySummer', v)}</strong><Est l={l} />
        <p>{T('palette.balance.waterRecorded', v)}</p>
        <NotRecorded ids={none} name={name} size={size} />
      </li>
    );
  }
  if (said === 'waterMix') {
    // Board PaletteMore: "Water needs: one thirsty plant among 9 recorded", then who needs what.
    const n = (k: string) => Number(l.vars[k] ?? 0);
    const [re, dr, me] = [n('regular'), n('dry'), n('medium')];
    const reg = w.members.slice(0, re), dry = w.members.slice(re, re + dr), mid = w.members.slice(re + dr, re + dr + me);
    const small = [reg, dry, mid].every((g) => inlineNames(g.length, size));
    // "3 thirsty: …, dry-loving: …; … sit between." from the three groups' names (each through Names).
    const sentence = (hi: string, lo: string, between: string | null) => T('palette.balance.waterMixSentence', {
      high: P('palette.balance.waterMixHigh', re, { names: hi }), low: T('palette.balance.waterMixLow', { names: lo }),
      mid: between === null ? '' : P('palette.balance.waterMixMid', mid.length, { names: between }),
    });
    return (
      <li data-weigh="water">
        <strong>{P('palette.balance.waterMix', re, v)}</strong><Est l={l} />
        <p>{T('palette.balance.waterMixFor', v)}{small && <> <Names ids={reg} name={name} size={size} and text={(hi) => <Names ids={dry} name={name} size={size} and text={(lo) => (mid.length
          ? <Names ids={mid} name={name} size={size} and text={(between) => sentence(hi, lo, between)} />
          : sentence(hi, lo, null))} />} /></>}</p>
        {!small && <><Group label={T('palette.balance.useHigh')} ids={reg} name={name} size={size} /><Group label={T('palette.balance.useLow')} ids={dry} name={name} size={size} /><Group label={T('palette.balance.useMedium')} ids={mid} name={name} size={size} /></>}
        <NotRecorded ids={none} name={name} size={size} />
      </li>
    );
  }
  if (said === 'notRecordedNamed') return <li data-weigh="water"><NotRecorded ids={none} name={name} size={size} /></li>;
  // Too few recorded to judge ("Water needs: recorded for 2 of 12, not enough to judge").
  return (
    <li data-weigh="water">
      <strong>{T('plants.weigh.waterFew', v)}</strong><Est l={l} />
      <NotRecorded ids={none} name={name} size={size} />
    </li>
  );
}

// "Water use" (Kumasi): the recorded use, high, medium, low, then the plants not recorded; each label
// bold, the names under the size rule (BC3, BC18), the estimate mark on a borrowed list (R10).
function WaterUse({ w, name, size }: { w: WeighLine; name: NameOf; size: number }) {
  const n = (k: string) => Number(w.line.vars[k] ?? 0);
  const [hi, me, lo, mi] = [n('high'), n('medium'), n('low'), n('missing')];
  const cuts = [0, hi, hi + me, hi + me + lo, hi + me + lo + mi];
  const part = (i: number) => w.members.slice(cuts[i], cuts[i + 1]);
  return (
    <section class="ct-chart ct-balance ct-side-card" aria-labelledby="ct-water-h">
      <h3 id="ct-water-h">{T('palette.balance.waterUseTitle')}<Est l={w.line} /></h3>
      <p class="ct-chart-intro ct-water-lead">{T('palette.balance.waterUseLead')}</p>
      <Group label={T('palette.balance.useHigh')} ids={part(0)} name={name} size={size} />
      <Group label={T('palette.balance.useMedium')} ids={part(1)} name={name} size={size} />
      <Group label={T('palette.balance.useLow')} ids={part(2)} name={name} size={size} />
      {mi > 0 && <div><strong>{P('palette.balance.useMissing', mi)}</strong> <Names ids={part(3)} name={name} size={size} text={(x) => `${x}.`} /> <span>{T('palette.balance.notAPass')}</span></div>}
    </section>
  );
}

export function Balance({ members, unchecked }: { members: readonly Taxon[]; unchecked: number }) {
  const { inputs, period } = store.verdictContext.value;
  // While a list is read (store.listsState) the lines wait; a list that failed is counted as unchecked.
  const pending = store.listsState.value === 'loading';
  const verdicts = store.memberVerdicts.value;
  const out = useMemo(() => weighLines(members, { inputs, period }, { pending, unchecked, verdicts }), [members, pending, unchecked, inputs, period, verdicts]);
  const byId = useMemo(() => new Map(members.map((t) => [t.id, t])), [members]);
  const name = nameIn(byId), size = members.length;
  if (out !== 'checking' && !out.length && !unchecked) return null;
  const use = out === 'checking' ? null : out.find((w) => K(w.line) === 'waterUseTitle') ?? null;
  const rest = out === 'checking' ? [] : out.filter((w) => w !== use);
  return (
    <>
      {(out === 'checking' || rest.length > 0 || unchecked > 0) && (
        <section class="ct-chart ct-balance ct-side-card" id="ct-balance" aria-labelledby="ct-balance-h">
          <h3 id="ct-balance-h">{T('palette.balance.title')} <span class="ct-balance-sub">{T('palette.balance.lead')}</span></h3>
          {out === 'checking' ? <p>{T('plants.weigh.checking')}</p> : (
            <>
              {unchecked > 0 && <p>{P('plants.weigh.unchecked', unchecked)}</p>}
              {rest.length > 0 && <ul class="ct-balance-lines">{rest.map((w) => <BalanceItem key={`${w.kind}:${w.kind === 'family' ? w.line.vars.family : K(w.line)}`} w={w} name={name} size={size} />)}</ul>}
            </>
          )}
        </section>
      )}
      {use && <WaterUse w={use} name={name} size={size} />}
    </>
  );
}
