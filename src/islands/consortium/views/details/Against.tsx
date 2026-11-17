/** @jsxImportSource preact */
// "Against your place" (PP-C c2, slices 3.4; boards Details, DetailsMore, DetailsDesk): one plant's
// verdict in words, the first section of Details. The fit line, then each factor with the limiting one
// first (the place's value against the plant's band), the notes, the placement's hedges, and what the
// plant's own later period changes; every word from core verdict-line.ts (againstLines). The verdict
// rule comes from the store (store.verdictRule, its own chunk, role `verdict`): this file never
// imports verdict.ts, so the details chunk stays off the rule (K3). Until the rule is here the section
// says it is checking; when its chunk failed, "Not checked" with Try again (Reload when only a reload
// can work, store.verdictNeedsReload; 3.1). Then one band per measure (core bandsOf, soilBandOf; board
// Details): its glyph, name and status pill, the drawing (aria-hidden: the lines under it are its text
// form), and the measure's lines; the rest of the lines after, then the band key in four words.
import { useEffect } from 'preact/hooks';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import type { ComponentChildren } from 'preact';
import type { AgainstEntry, Band, Dispute, Line, Measure, PlantVerdict, Scenario, Taxon, TraitSource } from '../../../../lib/consortium/index.ts';
import { againstLines, bandsOf, levelLine, limitOf, lineTerm, periodName, scenarioName, soilBandOf } from '../../../../lib/consortium/index.ts';
import { LevelIcon, say } from '../kit/fit.tsx';
import { formatNumber, formatTemp } from '../../format.ts';
import { pageLang } from '../../strings.ts';

// The disputed bound each band can carry (Dispute.field).
const DISPUTED: Partial<Record<Measure, Dispute['field']>> = { tminCold: 'tmin_cold.low', tmeanYear: 'tmean_year.low' };
// Each measure's glyph (board Details: a thermometer, a moon, a sun, a cloud, the soil sprout).
const GLYPH: Record<Measure, string> = {
  tminCold: 'M15.5 12.6A6.5 6.5 0 0 1 7.4 4.5a6.5 6.5 0 1 0 8.1 8.1Z',
  tmeanYear: 'M8 11.5V4a2 2 0 0 1 4 0v7.5a3.5 3.5 0 1 1-4 0ZM10 8v5.5',
  tmeanWarm: 'M8 11.5V4a2 2 0 0 1 4 0v7.5a3.5 3.5 0 1 1-4 0ZM10 8v5.5',
  tmaxWarm: 'M10 6.5a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7ZM10 2v2M10 16v2M2 10h2M16 10h2M4.3 4.3l1.4 1.4M14.3 14.3l1.4 1.4M4.3 15.7l1.4-1.4M14.3 5.7l1.4-1.4',
  aridity: 'M6 11.5a3.2 3.2 0 1 1 .8-6.3 4 4 0 0 1 7.6 1.1 2.7 2.7 0 0 1-.5 5.2ZM7 14l-1 2.5M10.5 14l-1 2.5M14 14l-1 2.5',
  soilPh: 'M10 3v7M10 10l-4.5 6M10 10l4.5 6M10 10v7M3 10h14',
};
const W = 324, PAD = 6;

// One measure's band, drawn (aria-hidden: the lines under it say it in words): the recorded range
// (always drawn from its recorded ends, so a place past them is never drawn inside it), with an end
// stroke and number only at the ends the rule checks, the tick where it is most often recorded, the
// place at the page's period (a dot, "today 19.0 °C") and in its later period (a ring), the whole band
// dashed on few records. A disputed low (board DetailsDesk, "−8.2?"): its number carries a question
// mark, and the stretch from it to the other source's stricter limit is dashed (without that value,
// the end itself).
function BandDraw({ b, disputes, period }: { b: Band; disputes: readonly Dispute[]; period: string | null }) {
  const lang = pageLang();
  const field = DISPUTED[b.measure];
  const limit = field ? disputes.map((d) => (d.field === field ? limitOf(d) : null)).find((x) => x) ?? null : null;
  const xs = [b.recordedLow, b.recordedHigh, b.place, b.later, b.median, limit?.valueC].filter((x): x is number => x !== null && x !== undefined);
  const span = Math.max(...xs) - Math.min(...xs) || 1;
  const lo = Math.min(...xs) - span * 0.12, hi = Math.max(...xs) + span * 0.12;
  const x = (v: number) => PAD + ((v - lo) / (hi - lo)) * (W - 2 * PAD);
  const end = (v: number) => formatNumber(v, lang, 2); // a limit keeps its two decimals (R5)
  const at = (v: number) => (b.measure === 'aridity' ? formatNumber(v, lang, 2) : b.measure === 'soilPh' ? `pH ${formatNumber(v, lang, 1)}` : formatTemp(v, lang, 1));
  const x0 = x(b.low ?? b.recordedLow), x1 = x(b.high ?? b.recordedHigh);
  const disputed = b.disputedLow && b.low !== null;
  // The other source's stricter low, where the solid range starts (the kept, looser stretch dashed).
  const xs0 = disputed && limit && limit.valueC > b.low! ? x(limit.valueC) : x0;
  // Both labels on the same side of both markers, so neither crosses the other's line.
  const marks = [b.place, b.later].filter((v): v is number => v !== null).map(x);
  const right = Math.max(...marks) > W * 0.62;
  const label = (y: number, text: string, cls: string) => <text class={cls} x={right ? Math.min(...marks) - 5 : Math.max(...marks) + 5} y={y} text-anchor={right ? 'end' : 'start'}>{text}</text>;
  return (
    <svg class="ct-band" data-few={b.few ? '' : undefined} viewBox={`0 0 ${W} 66`} width={W} height="66" aria-hidden="true" focusable="false">
      <path d={`M0 43H${W}`} class="ct-bd-axis" />
      <rect x={xs0} y="38" width={Math.max(1, x1 - xs0)} height="10" class="ct-bd-range" />
      <path d={`M${xs0} 38H${x1}M${xs0} 48H${x1}`} class={b.few ? 'ct-bd-edge is-dashed' : 'ct-bd-edge'} />
      {b.low !== null && <path d={`M${x0} 38v10`} class={disputed ? 'ct-bd-end is-dashed' : 'ct-bd-end'} />}
      {b.high !== null && <path d={`M${x1} 38v10`} class="ct-bd-end" />}
      {xs0 !== x0 && <path data-disputed d={`M${x0} 38H${xs0}M${x0} 48H${xs0}`} class="ct-bd-edge is-dashed" />}
      {b.median !== null && <path d={`M${x(b.median)} 36v14`} class="ct-bd-tick" />}
      <g class="ct-bd-num">
        {b.low !== null && <text x={x0} y="62" text-anchor="middle">{end(b.low)}{disputed ? '?' : ''}</text>}
        {b.high !== null && <text x={x1} y="62" text-anchor="middle">{end(b.high)}</text>}
      </g>
      {b.place !== null && <><path d={`M${x(b.place)} 4V54`} class="ct-bd-now" /><circle cx={x(b.place)} cy="43" r="4" class="ct-bd-now-dot" />{label(13, `${say(b.when.dot)} ${at(b.place)}`, 'ct-bd-now-text')}</>}
      {b.later !== null && period && <><path d={`M${x(b.later)} 17V54`} class="ct-bd-later" /><circle cx={x(b.later)} cy="43" r="4" class="ct-bd-later-dot" />{label(26, `${period}: ${at(b.later)}`, 'ct-bd-later-text')}</>}
    </svg>
  );
}

// A band's card: the measure's glyph and name, its status (the level's icon and words: never colour
// alone), the drawing, and the measure's lines.
function BandCard({ b, disputes, period, children }: { b: Band; disputes: readonly Dispute[]; period: string | null; children: ComponentChildren }) {
  return (
    <div class="ct-bandcard" data-measure={b.measure} data-level={b.level}>
      <div class="ct-bandcard-head">
        <b><svg class="ct-bandcard-glyph" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d={GLYPH[b.measure]} /></svg>{say(b.title)}</b>
        <span class="ct-bandcard-status" data-level={b.level}><LevelIcon level={b.level} />{say(b.status)}</span>
      </div>
      <BandDraw b={b} disputes={disputes} period={period} />
      {children}
    </div>
  );
}

// The plant's verdict for the page period, from the store's maps when it is there (members, the pool),
// else computed for this plant alone (a plant opened from a link or a guest list).
function verdictOf(t: Taxon): PlantVerdict | null {
  const rule = store.verdictRule.value;
  if (!rule) return null;
  return store.memberVerdicts.value?.get(t.id) ?? store.poolVerdicts.value?.get(t.id) ?? rule.verdicts([t], store.verdictContext.value).get(t.id) ?? null;
}
// A line's words, then its hedges each in its own span, data-conf on those that say a confidence term
// (`terms`: false on a later period's lines, whose hedges are words only).
function Words({ line, terms }: { line: Line; terms: boolean }) {
  const { also, ...own } = line;
  return (
    <>
      {say(own)}
      {(also ?? []).map((a) => {
        const term = terms ? lineTerm(a) : null;
        return <> <span data-conf={term ?? undefined}>{say(a)}</span></>;
      })}
    </>
  );
}

export function Against({ t, disputes = [], traitSources = null }: { t: Taxon; disputes?: readonly Dispute[]; traitSources?: readonly TraitSource[] | null }) {
  // Details may open before the palette page asked for the rule (a link, a list chosen without a
  // location): ask for it here too (one load, store.wantVerdict).
  // A failed load is not retried by opening a sheet: the section offers Try again itself.
  useEffect(() => { if (!store.verdictFailed.peek()) store.wantVerdict(); }, []);
  const v = verdictOf(t);
  const head = <h3 id="ct-d-against">{T('details.against')}</h3>;
  if (!v) {
    const failed = store.verdictFailed.value;
    return (
      <section class="ct-against" data-against aria-labelledby="ct-d-against" aria-busy={failed ? undefined : 'true'}>
        {head}
        {failed
          ? <>
              <p data-level="unknown" data-conf="not-checked">{say(levelLine('unknown'))}</p>
              {/* The words match the action (A6): Try again in place, Reload only when only a reload can work. */}
              {store.verdictNeedsReload.value
                ? <><p class="ct-muted">{T('details.loadFailed')}</p><p><button type="button" class="button button-secondary" onClick={() => location.reload()}>{T('details.reload')}</button></p></>
                : <><p class="ct-muted">{T('d.checkFailed')}</p><p><button type="button" class="button button-secondary" onClick={() => store.retryVerdict()}>{T('details.tryAgain')}</button></p></>}
            </>
          : <p class="ct-muted">{T('details.checking')}</p>}
      </section>
    );
  }
  const scenario = scenarioName(store.verdictContext.value.scenario as Scenario);
  const later = store.laterVerdictOf(t, v);
  // The placement's estimate is said once, in the header (minor, round 3), not again here.
  const entries = againstLines(v, later, { period: periodName, scenario, heightM: t.traits.height_m?.max ?? null }).filter((e) => !e.placement);
  const soil = store.soil.value;
  const bands = [...bandsOf(v, later, t.climate), soilBandOf(t, v, soil.from === 'own' ? soil.ph : null, traitSources)].filter((b): b is Band => !!b);
  const period = later ? periodName(later.judged) : null;
  // Each measure's lines under its band; the rest (notes, hedges, the later period's lines) after.
  const inBand = (e: AgainstEntry, b: Band) => !e.later && !e.note && !!e.factor && b.factors.includes(e.factor);
  const [fit, ...rest] = entries;
  const others = rest.filter((e) => !bands.some((b) => inBand(e, b)));
  // The bands in the lines' order (the limiting measure first), the soil card last.
  const firstOf = (b: Band) => { const i = rest.findIndex((e) => inBand(e, b)); return b.measure === 'soilPh' ? Infinity : i < 0 ? rest.length : i; };
  bands.sort((a, b) => firstOf(a) - firstOf(b));
  const climateBands = bands.filter((b) => !b.range);
  const item = (e: AgainstEntry) => <li data-factor={e.factor} data-level={e.level} data-note={e.note} data-later={e.later ? '' : undefined} data-conf={e.conf} data-no-site={e.noSite ? '' : undefined}><Words line={e.line} terms={!e.later} /></li>;
  return (
    <section class="ct-against" data-against aria-labelledby="ct-d-against">
      {head}
      <p class="ct-against-fit" data-level={fit.level}><LevelIcon level={fit.level ?? v.level} /><span><Words line={fit.line} terms /></span></p>
      {bands.map((b) => <BandCard b={b} disputes={disputes} period={period}>{b.range && <p class="ct-small ct-muted" data-band-range>{say(b.range)}</p>}<ul class="ct-against-lines">{rest.filter((e) => inBand(e, b)).map(item)}</ul></BandCard>)}
      {others.length > 0 && <ul class="ct-against-lines">{others.map(item)}</ul>}
      {/* The key of the climate bands (the soil card says its own range). */}
      {climateBands.length > 0 && (
        <ul class="ct-band-key" data-band-key>
          <li><svg viewBox="0 0 26 12" width="26" height="12" aria-hidden="true"><rect x="1" y="1" width="24" height="10" rx="2" class="ct-bd-range ct-bd-edge" /><path d="M12 0v12" class="ct-bd-tick" /></svg>{T('details.keyRange')}</li>
          <li><svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" class="ct-bd-now-dot" /></svg>{say(climateBands[0].when.key)}</li>
          <li><svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" class="ct-bd-later-dot" /></svg>{T('details.keyLater')}</li>
          <li><svg viewBox="0 0 22 12" width="22" height="12" aria-hidden="true"><rect x="1" y="1" width="20" height="10" rx="2" class="ct-bd-edge is-dashed" fill="none" /></svg>{T('details.keyDashed')}</li>
        </ul>
      )}
    </section>
  );
}
