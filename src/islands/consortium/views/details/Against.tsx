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
import { useEffect, useState } from 'preact/hooks';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import type { ComponentChildren } from 'preact';
import type { AgainstEntry, Band, Dispute, Line, Measure, Scenario, Taxon, TraitSource } from '../../../../lib/consortium/index.ts';
import { againstLines, bandsOf, datasetLines, levelLine, limitOf, lineTerm, periodName, rangeSources, scenarioName, soilBandOf, soilPhOf } from '../../../../lib/consortium/index.ts';
import { LevelIcon, say } from '../kit/fit.tsx';
import { coords } from '../kit/names.ts';
import { formatLength, formatNumber, formatTemp } from '../../format.ts';
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
const ORDER: readonly Measure[] = ['tminCold', 'tmeanYear', 'tmeanWarm', 'tmaxWarm', 'aridity'];

// One measure's band, drawn (aria-hidden: the lines under it say it in words): the recorded range
// (always drawn from its recorded ends, so a place past them is never drawn inside it), with an end
// stroke and number only at the ends the rule checks, the tick where it is most often recorded, the
// place at the page's period (a dot, "today 19.0 °C") and in its later period (a ring), the whole band
// dashed on few records. A disputed low (board DetailsDesk, "−8.2?"): its number carries a question
// mark, and the stretch from it to the other source's stricter limit is dashed (without that value,
// to a mark the band draws from data: the place when it is inside the range, else the tick where it is
// most often recorded; never an invented start). Negative numbers take a true minus sign.
const minus = (s: string): string => s.replace(/-(?=\d)/g, '\u2212');
function BandDraw({ b, disputes, period }: { b: Band; disputes: readonly Dispute[]; period: string | null }) {
  const lang = pageLang();
  const field = DISPUTED[b.measure];
  const limit = field ? disputes.map((d) => (d.field === field ? limitOf(d) : null)).find((x) => x) ?? null : null;
  const xs = [b.recordedLow, b.recordedHigh, b.place, b.later, b.median, limit?.valueC].filter((x): x is number => x !== null && x !== undefined);
  const span = Math.max(...xs) - Math.min(...xs) || 1;
  const lo = Math.min(...xs) - span * 0.12, hi = Math.max(...xs) + span * 0.12;
  const x = (v: number) => PAD + ((v - lo) / (hi - lo)) * (W - 2 * PAD);
  const end = (v: number) => minus(formatNumber(v, lang, 2)); // a limit keeps its two decimals (R5)
  const at = (v: number) => minus(b.measure === 'aridity' ? formatNumber(v, lang, 2) : b.measure === 'soilPh' ? `pH ${formatNumber(v, lang, 1)}` : formatTemp(v, lang, 1));
  const x0 = x(b.low ?? b.recordedLow), x1 = x(b.high ?? b.recordedHigh);
  const disputed = b.disputedLow && b.low !== null;
  // The other source's stricter low, where the solid range starts (the kept, looser stretch dashed).
  const top = b.high ?? b.recordedHigh;
  const inside = b.place !== null && b.place > b.low! && b.place <= top;
  const stricter = !disputed ? null : limit && limit.valueC > b.low! ? limit.valueC : inside ? b.place : b.median !== null && b.median > b.low! ? b.median : null;
  const xs0 = stricter === null ? x0 : Math.min(x(stricter), x1);
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

export function Against({ t, disputes = [], subject = null }: { t: Taxon; disputes?: readonly Dispute[]; traitSources?: readonly TraitSource[] | null; subject?: string | null }) {
  const [table, setTable] = useState(false);
  // Details may open before the palette page asked for the rule (a link, a list chosen without a
  // location): ask for it here too (one load, store.wantVerdict).
  // A failed load is not retried by opening a sheet: the section offers Try again itself.
  useEffect(() => { if (!store.verdictFailed.peek()) store.wantVerdict(); }, []);
  const v = store.verdictOf(t);
  // The line under the heading (board Details): what the bands draw, near which place (its name, else
  // its coordinates as the location card writes them: kit/names.ts coords).
  const loc = store.location.value;
  const where = loc && (loc.label ?? coords(loc.lat, loc.lon));
  const head = <><h3 id="ct-d-against">{T('details.against')}</h3>{where && <p class="ct-against-lede" data-against-lede>{subject ? T('details.againstLedeOf', { place: where, name: subject }) : T('details.againstLede', { place: where })}</p>}</>;
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
  // The four climate bands in the boards' one order (Coldest nights, Warmth over the year, Hottest days,
  // Rain against evaporation); the soil is its own card under the section (SoilCard).
  const bands = bandsOf(v, later, t.climate).filter((b): b is Band => !!b).sort((a, b) => ORDER.indexOf(a.measure) - ORDER.indexOf(b.measure));
  const period = later ? periodName(later.judged) : null;
  // Each measure's lines under its band; the rest (notes, hedges, the later period's lines) after.
  const inBand = (e: AgainstEntry, b: Band) => !e.later && !e.note && !!e.factor && b.factors.includes(e.factor);
  const [fit, ...rest] = entries;
  // The soil's line is the soil card's (SoilCard), never repeated here.
  const others = rest.filter((e) => e.factor !== 'soil-ph' && !bands.some((b) => inBand(e, b)));
  const climateBands = bands;
  const lang = pageLang();
  const at = (b: Band, x: number | null) => (x === null ? '–' : (b.measure === 'aridity' ? formatNumber(x, lang, 2) : formatTemp(x, lang, 1)).replace(/-(?=\d)/g, '\u2212'));
  const c = t.climate;
  const sources = rangeSources(t, disputes).map((x) => x.name).join(', ');
  const item = (e: AgainstEntry) => <li data-factor={e.factor} data-level={e.level} data-note={e.note} data-later={e.later ? '' : undefined} data-conf={e.conf} data-no-site={e.noSite ? '' : undefined}><Words line={e.line} terms={!e.later} /></li>;
  return (
    <section class="ct-against" data-against aria-labelledby="ct-d-against">
      {head}
      <p class="ct-against-fit" data-level={fit.level}><LevelIcon level={fit.level ?? v.level} /><span><Words line={fit.line} terms /></span></p>
      {bands.map((b) => <BandCard b={b} disputes={disputes} period={period}><ul class="ct-against-lines">{rest.filter((e) => inBand(e, b)).map(item)}</ul></BandCard>)}
      {others.length > 0 && <ul class="ct-against-lines">{others.map(item)}</ul>}
      {/* The key of the climate bands (the soil card says its own range). */}
      {climateBands.length > 0 && (
        <ul class="ct-band-key" data-band-key>
          <li><svg viewBox="0 0 26 12" width="26" height="12" aria-hidden="true"><rect x="1" y="1" width="24" height="10" rx="2" class="ct-bd-range ct-bd-edge" /><path d="M12 0v12" class="ct-bd-tick" /></svg>{T('details.keyRange')}</li>
          <li><svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" class="ct-bd-now-dot" /></svg>{say(climateBands[0].when.key)}</li>
          {/* The ring's entry only when a ring is drawn (round 4 V7: a later page draws none). */}
          {period && climateBands.some((b) => b.later !== null) && <li data-key-later><svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" class="ct-bd-later-dot" /></svg>{T('details.keyLater')}</li>}
          <li><svg viewBox="0 0 22 12" width="22" height="12" aria-hidden="true"><rect x="1" y="1" width="20" height="10" rx="2" class="ct-bd-edge is-dashed" fill="none" /></svg>{T('details.keyDashed')}</li>
        </ul>
      )}
      {/* Where the bands come from, and their text form as a table (boards Details, DetailsDesk). */}
      {c && climateBands.length > 0 && (
        <p class="ct-small ct-against-records" data-records>
          {c.cells !== null ? T('details.recordsFrom', { sources, n: formatNumber(c.cells, lang, 0) }) : T('details.recordsFromSources', { sources })}
          {datasetLines(store.source.value?.info() ?? { rangesReview: null }).length > 0 && <> {T('details.recordsNotReviewed')}</>}
          {' '}<button type="button" class="ct-link-button" aria-expanded={table} onClick={() => setTable(!table)}>{T(table ? 'details.hideTable' : 'details.showTable')}</button>
        </p>
      )}
      {table && (
        <table class="ct-band-table" data-band-table>
          <thead><tr><th scope="col">{T('details.tMeasure')}</th><th scope="col">{say(climateBands[0].when.key)}</th>{period && <th scope="col">{period}</th>}<th scope="col">{T('details.tRecorded')}</th></tr></thead>
          <tbody>{climateBands.map((b) => <tr><th scope="row">{say(b.title)}</th><td>{at(b, b.place)}</td>{period && <td>{at(b, b.later)}</td>}<td>{at(b, b.recordedLow)} – {at(b, b.recordedHigh)}</td></tr>)}</tbody>
        </table>
      )}
    </section>
  );
}

// The soil card (boards Details, DarkDetails, SiteMendoza; R3: soil pH is a hint that never sets the
// level): the plant's recorded pH range against the soil map's value (a ring, "soil map: pH 6.3") and
// the grower's own test (a dot), its status in words, the lines in words, the drainage need, and
// "Set my own soil pH" (store.openFigure: the figures panel's soil line). Without a map value, "not
// checked on soil pH" (F10); from a neighbouring square, "a weaker guess". The desk shows the map's say
// on the Niche row instead (board DetailsDesk; details.css).
export function SoilCard({ t, traitSources = null }: { t: Taxon; traitSources?: readonly TraitSource[] | null }) {
  const lang = pageLang();
  const input = store.siteInputs.value?.soilPh ?? null;
  const map = input?.map ?? null, own = input?.source === 'grower' ? input.value : null;
  const near = input?.nearKm ?? null;
  const ph = soilPhOf(store.siteInputs.value);
  const v = store.verdictOf(t);
  const r = t.traits.soil_ph;
  const ranged = !!r && r.min !== null && r.max !== null;
  const b = v && ranged ? soilBandOf(t, v, ph, traitSources) : null;
  const level = b?.level ?? 'unknown';
  const status = ph === null || level === 'unknown' ? T('details.soilNotChecked')
    : own !== null ? T(level === 'fits' ? 'details.soilFitsYours' : 'details.soilOffYours') : T(level === 'fits' ? 'details.soilFitsLikely' : 'details.soilOffLikely');
  const n = (x: number) => formatNumber(x, lang, 1);
  const lo = ranged ? Math.min(r!.min!, ...(map !== null ? [map] : []), ...(own !== null ? [own] : [])) : 0;
  const hi = ranged ? Math.max(r!.max!, ...(map !== null ? [map] : []), ...(own !== null ? [own] : [])) : 1;
  const span = hi - lo || 1;
  const x = (val: number) => PAD + ((val - (lo - span * 0.25)) / (span * 1.5)) * (W - 2 * PAD);
  const line = !ranged ? T('details.soilNoRange')
    : own !== null ? T(map !== null ? 'details.soilLineYours' : 'details.soilLineYoursNoMap', { min: n(r!.min!), max: n(r!.max!), ph: n(own), map: map !== null ? n(map) : '' })
    : map !== null ? T('details.soilLineMap', { min: n(r!.min!), max: n(r!.max!), ph: n(map) })
    : T('details.soilLineNone', { min: n(r!.min!), max: n(r!.max!) });
  return (
    <section class="ct-soilcard" data-soil-card data-level={level} aria-labelledby="ct-d-soil">
      <div class="ct-bandcard-head">
        <b id="ct-d-soil"><svg class="ct-bandcard-glyph" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d={GLYPH.soilPh} /></svg>{T('details.soilTitle')}</b>
        {ranged && <span class="ct-bandcard-status" data-level={level}><LevelIcon level={level} />{status}</span>}
      </div>
      {ranged && (
        <svg class="ct-band" viewBox={`0 0 ${W} 60`} width={W} height="60" aria-hidden="true" focusable="false">
          <path d={`M0 37H${W}`} class="ct-bd-axis" />
          <rect x={x(r!.min!)} y="32" width={Math.max(1, x(r!.max!) - x(r!.min!))} height="10" class="ct-bd-range" />
          <path d={`M${x(r!.min!)} 32H${x(r!.max!)}M${x(r!.min!)} 42H${x(r!.max!)}M${x(r!.min!)} 32v10M${x(r!.max!)} 32v10`} class="ct-bd-edge" />
          <g class="ct-bd-num"><text x={x(r!.min!)} y="56" text-anchor="middle">{n(r!.min!)}</text><text x={x(r!.max!)} y="56" text-anchor="middle">{n(r!.max!)}</text></g>
          {map !== null && <><path d={`M${x(map)} 8V46`} class="ct-bd-later" /><circle cx={x(map)} cy="37" r="4" class="ct-bd-later-dot" /><text class="ct-bd-later-text" x={x(map) + 5} y="16">{T('details.soilMapLabel', { ph: n(map) })}</text></>}
          {own !== null && <><path d={`M${x(own)} 20V48`} class="ct-bd-now" /><circle cx={x(own)} cy="37" r="4" class="ct-bd-now-dot" /><text class="ct-bd-now-text" x={x(own) + 5} y="28">{T('details.soilOwnLabel', { ph: n(own) })}</text></>}
        </svg>
      )}
      <p class="ct-small" data-soil-line>{line}{near !== null && own === null && map !== null && <> {T('details.soilNear', { dist: formatLength(Math.round(near) * 1000, lang, 0) })}</>} <span data-drainage>{T('details.drainageNone')}</span></p>
      <p class="ct-small"><button type="button" class="ct-link-button" data-set-ph onClick={() => store.openFigure('soilPh')}>{T('details.setOwnPh')}</button> · {T('details.soilNotProjected')}</p>
    </section>
  );
}
