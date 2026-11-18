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
import type { AgainstEntry, Band, Dispute, Level, Line, Measure, Scenario, Taxon } from '../../../../lib/consortium/index.ts';
import { againstLines, bandsOf, datasetLines, drainageLine, levelLine, limitOf, lineTerm, periodName, rangeSources, scenarioName, soilBandOf, soilPhOf } from '../../../../lib/consortium/index.ts';
import { LevelIcon, MEASURE_GLYPH, midSentence, say } from '../kit/fit.tsx';
import { WARN } from '../kit/icons.tsx';
import { coords } from '../kit/names.ts';
import { formatNumber, formatTemp } from '../../format.ts';
import { pageLang } from '../../strings.ts';

// The disputed bound each band can carry (Dispute.field).
const DISPUTED: Partial<Record<Measure, Dispute['field']>> = { tminCold: 'tmin_cold.low', tmeanYear: 'tmean_year.low' };
const W = 324, PAD = 6;
// The boards' four bands, in their one order (Coldest nights, Warmth over the year, Hottest days, Rain
// against evaporation). A measure core draws beyond them (the summer warmth a plant needs, tmeanWarm) has
// no band on any v14 board: its lines stay in the list under the bands, so no limit is hidden (C6).
const ORDER: readonly Measure[] = ['tminCold', 'tmeanYear', 'tmaxWarm', 'aridity'];

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
        <b><svg class="ct-bandcard-glyph" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d={MEASURE_GLYPH[b.measure]} /></svg>{say(b.title)}</b>
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

export function Against({ t, disputes = [], subject = null, gbifRecords = null }: { t: Taxon; disputes?: readonly Dispute[]; subject?: string | null; gbifRecords?: number | null }) {
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
  // The four climate bands in the boards' one order (ORDER), no other; the soil is its own card under the
  // section (SoilCard).
  const bands = bandsOf(v, later, t.climate).filter((b): b is Band => !!b && ORDER.includes(b.measure)).sort((a, b) => ORDER.indexOf(a.measure) - ORDER.indexOf(b.measure));
  const period = later ? periodName(later.judged) : null;
  // Each measure's lines under its band; the rest (notes, hedges, the later period's lines) after.
  const inBand = (e: AgainstEntry, b: Band) => !e.later && !e.note && !!e.factor && b.factors.includes(e.factor);
  const [fit, ...rest] = entries;
  // The soil's line is the soil card's (SoilCard), never repeated here.
  const others = rest.filter((e) => e.factor !== 'soil-ph' && !bands.some((b) => inBand(e, b)));
  const lang = pageLang();
  const at = (b: Band, x: number | null) => (x === null ? '–' : (b.measure === 'aridity' ? formatNumber(x, lang, 2) : formatTemp(x, lang, 1)).replace(/-(?=\d)/g, '\u2212'));
  const c = t.climate;
  const sources = rangeSources(t, disputes).map((x) => x.name).join(', ');
  // A later period's line that asks a second look or is outside (board DetailsDesk: "By 2041–2070
  // (SSP2-4.5): Needs a second look", "Hotter summers here…") carries the warning mark and colour; the
  // later lines without a level of their own (the scenario spread) take the period's.
  const laterLevel = later && later.judged !== v.judged ? later.level : null;
  const item = (e: AgainstEntry) => {
    const lvl = e.level ?? (e.later ? laterLevel ?? undefined : undefined);
    const warned = e.later && (lvl === 'look' || lvl === 'outside');
    return <li data-factor={e.factor} data-level={lvl} data-note={e.note} data-later={e.later ? '' : undefined} data-conf={e.conf} data-no-site={e.noSite ? '' : undefined} data-warned={warned ? '' : undefined}>{warned && WARN}<span><Words line={e.line} terms={!e.later} /></span></li>;
  };
  return (
    <section class="ct-against" data-against aria-labelledby="ct-d-against">
      {head}
      <p class="ct-against-fit" data-level={fit.level}><LevelIcon level={fit.level ?? v.level} /><span><Words line={fit.line} terms /></span></p>
      {bands.map((b) => <BandCard b={b} disputes={disputes} period={period}><ul class="ct-against-lines">{rest.filter((e) => inBand(e, b)).map(item)}</ul></BandCard>)}
      {others.length > 0 && <ul class="ct-against-lines">{others.map(item)}</ul>}
      {/* The key of the climate bands (the soil card says its own range). */}
      {bands.length > 0 && (
        <ul class="ct-band-key" data-band-key>
          <li><svg viewBox="0 0 26 12" width="26" height="12" aria-hidden="true"><rect x="1" y="1" width="24" height="10" rx="2" class="ct-bd-range ct-bd-edge" /><path d="M12 0v12" class="ct-bd-tick" /></svg>{T('details.keyRange')}</li>
          <li><svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" class="ct-bd-now-dot" /></svg>{say(bands[0].when.key)}</li>
          {/* The ring's entry only when a ring is drawn (round 4 V7: a later page draws none). */}
          {period && bands.some((b) => b.later !== null) && <li data-key-later><svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="4" class="ct-bd-later-dot" /></svg>{T('details.keyLater')}</li>}
          <li><svg viewBox="0 0 22 12" width="22" height="12" aria-hidden="true"><rect x="1" y="1" width="20" height="10" rx="2" class="ct-bd-edge is-dashed" fill="none" /></svg>{T('details.keyDashed')}</li>
        </ul>
      )}
      {/* Where the bands come from, and their text form as a table (boards Details, DetailsDesk). */}
      {c && bands.length > 0 && (
        <p class="ct-small ct-against-records" data-records>
          {/* Board: "From 1,784 GBIF records of where it grows, thinned to 872 map squares…" (fix round 1 BC6:
              the release's record count; TreeGOER is named where its limit is used, in the band's words). */}
          {c.cells !== null && gbifRecords !== null && c.source?.startsWith('gbif')
            ? T('details.recordsFromGbif', { records: formatNumber(gbifRecords, lang, 0), n: formatNumber(c.cells, lang, 0) })
            : c.cells !== null ? T('details.recordsFrom', { sources, n: formatNumber(c.cells, lang, 0) }) : T('details.recordsFromSources', { sources })}
          {datasetLines(store.source.value?.info() ?? { rangesReview: null }).length > 0 && <> {T('details.recordsNotReviewed')}</>}
          {' '}<button type="button" class="ct-link-button" aria-expanded={table} onClick={() => setTable(!table)}>{T(table ? 'details.hideTable' : 'details.showTable')}</button>
        </p>
      )}
      {table && (
        <table class="ct-band-table" data-band-table>
          <thead><tr><th scope="col">{T('details.tMeasure')}</th><th scope="col">{say(bands[0].when.key)}</th>{period && <th scope="col">{period}</th>}<th scope="col">{T('details.tRecorded')}</th></tr></thead>
          <tbody>{bands.map((b) => <tr><th scope="row">{say(b.title)}</th><td>{at(b, b.place)}</td>{period && <td>{at(b, b.later)}</td>}<td>{at(b, b.recordedLow)} – {at(b, b.recordedHigh)}</td></tr>)}</tbody>
        </table>
      )}
    </section>
  );
}

// What Details says about soil, one source for both layouts (fix round 1 R3): the soil card on a phone,
// the Niche row on the desk. The level is the core's soil band (soilBandOf, its level only: its range line is not shown) on the value the engine
// judges (soilPhOf: the grower's test, else the map; none in pots), and every sentence names that value:
// "your test", "the soil map" (with its texture word when the map has one), or pots. A map value from a
// neighbouring square says how far, in kilometres: "a weaker guess" (F10).
export interface SoilSay { ranged: boolean; level: Level; status: string; line: string; near: string | null; niche: string | null; map: number | null; own: number | null }
// Kilometres, whole (format.ts has no kilometre unit yet): the number in the page's language, then "km".
const km = (n: number, lang: string): string => `${formatNumber(n, lang, 0)}\u00a0km`;
export function soilSayOf(t: Taxon): SoilSay {
  const lang = pageLang();
  const inputs = store.siteInputs.value;
  const input = inputs?.soilPh ?? null;
  const pots = inputs?.pots.value === true;
  const map = pots ? null : input?.map ?? null, own = pots || input?.source !== 'grower' ? null : input.value;
  const ph = soilPhOf(inputs);
  const v = store.verdictOf(t);
  const r = t.traits.soil_ph;
  const ranged = !!r && r.min !== null && r.max !== null;
  const level: Level = (v && ranged ? soilBandOf(t, v, ph)?.level : null) ?? 'unknown';
  const n = (x: number) => formatNumber(x, lang, 1);
  const status = ph === null || level === 'unknown' ? T('details.soilNotChecked')
    : own !== null ? T(level === 'fits' ? 'details.soilFitsYours' : 'details.soilOffYours') : T(level === 'fits' ? 'details.soilFitsLikely' : 'details.soilOffLikely');
  const texture = store.location.value?.lookup?.soil?.texture ?? null;
  const range = ranged ? { min: n(r!.min!), max: n(r!.max!) } : { min: '', max: '' };
  const line = !ranged ? T('details.soilNoRange')
    : pots ? T('details.soilPots', range)
    : own !== null ? T(input?.map != null ? 'details.soilLineYours' : 'details.soilLineYoursNoMap', { ...range, ph: n(own), map: input?.map != null ? n(input.map) : '' })
    : map !== null ? (texture ? T('details.soilLineMapTexture', { ...range, ph: n(map), texture: T(`details.texture.${texture}`) }) : T('details.soilLineMap', { ...range, ph: n(map) }))
    : T('details.soilLineNone', range);
  const nearKm = input?.nearKm ?? null;
  const near = nearKm !== null && own === null && map !== null ? T('details.soilNear', { dist: km(Math.round(nearKm), lang) }) : null;
  const fit = T(level === 'fits' ? 'details.phFits' : level === 'unknown' ? 'details.phNotChecked' : 'details.phOff');
  // No value to judge (F10): "not known … not checked on soil pH", never silence.
  const niche = !ranged ? null : pots ? T('details.phPots') : own !== null ? T('details.phTestSays', { ph: n(own), fit }) : map !== null ? T('details.phMapSays', { ph: n(map), fit }) : T('details.phNoData');
  return { ranged, level, status, line, near, niche, map, own };
}

// The soil card (boards Details, DarkDetails, SiteMendoza; R3: soil pH is a hint that never sets the
// level): the plant's recorded pH range against the soil map's value (a ring, "soil map: pH 6.3") and
// the grower's own test (a dot), its status and lines in words (soilSayOf), the drainage need (core
// drainageLine: the release's well_drained, or the hint when the grower's ground stays wet), and
// "Set my own soil pH" (store.openFigure: the figures panel's soil line). Without a map value, "not
// checked on soil pH" (F10); from a neighbouring square, "a weaker guess". The desk shows the same say on
// the Niche row instead (board DetailsDesk; Details renders no card there).
export function SoilCard({ t }: { t: Taxon }) {
  const lang = pageLang();
  const soil = soilSayOf(t);
  const { ranged, level, map, own } = soil;
  const r = t.traits.soil_ph;
  const n = (x: number) => formatNumber(x, lang, 1);
  const lo = ranged ? Math.min(r!.min!, ...(map !== null ? [map] : []), ...(own !== null ? [own] : [])) : 0;
  const hi = ranged ? Math.max(r!.max!, ...(map !== null ? [map] : []), ...(own !== null ? [own] : [])) : 1;
  const span = hi - lo || 1;
  const x = (val: number) => PAD + ((val - (lo - span * 0.25)) / (span * 1.5)) * (W - 2 * PAD);
  // A marker's label beside it, on the side with room (fix round 1 R7): past the middle, to its left.
  const label = (val: number, y: number, text: string, cls: string) => {
    const left = x(val) > W / 2;
    return <text class={cls} x={left ? x(val) - 5 : x(val) + 5} y={y} text-anchor={left ? 'end' : 'start'}>{text}</text>;
  };
  return (
    <section class="ct-soilcard" data-soil-card data-level={level} aria-labelledby="ct-d-soil">
      <div class="ct-bandcard-head">
        <b id="ct-d-soil"><svg class="ct-bandcard-glyph" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d={MEASURE_GLYPH.soilPh} /></svg>{T('details.soilTitle')}</b>
        {ranged && <span class="ct-bandcard-status" data-level={level}><LevelIcon level={level} />{soil.status}</span>}
      </div>
      {ranged && (
        <svg class="ct-band" viewBox={`0 0 ${W} 60`} width={W} height="60" aria-hidden="true" focusable="false">
          <path d={`M0 37H${W}`} class="ct-bd-axis" />
          <rect x={x(r!.min!)} y="32" width={Math.max(1, x(r!.max!) - x(r!.min!))} height="10" class="ct-bd-range" />
          <path d={`M${x(r!.min!)} 32H${x(r!.max!)}M${x(r!.min!)} 42H${x(r!.max!)}M${x(r!.min!)} 32v10M${x(r!.max!)} 32v10`} class="ct-bd-edge" />
          <g class="ct-bd-num"><text x={x(r!.min!)} y="56" text-anchor="middle">{n(r!.min!)}</text><text x={x(r!.max!)} y="56" text-anchor="middle">{n(r!.max!)}</text></g>
          {map !== null && <><path d={`M${x(map)} 8V46`} class="ct-bd-later" /><circle cx={x(map)} cy="37" r="4" class="ct-bd-later-dot" />{label(map, 16, T('details.soilMapLabel', { ph: n(map) }), 'ct-bd-later-text')}</>}
          {own !== null && <><path d={`M${x(own)} 20V48`} class="ct-bd-now" /><circle cx={x(own)} cy="37" r="4" class="ct-bd-now-dot" />{label(own, 28, T('details.soilOwnLabel', { ph: n(own) }), 'ct-bd-now-text')}</>}
        </svg>
      )}
      <p class="ct-small" data-soil-line>{soil.line}{soil.near && <> {soil.near}</>} <span data-drainage>{T('details.drainageSay', { what: midSentence(say(drainageLine(t, store.verdictOf(t)))) })}</span></p>
      <p class="ct-small"><button type="button" class="ct-link-button" data-set-ph onClick={() => store.openFigure('soilPh')}>{T('details.setOwnPh')}</button> · {T('details.soilNotProjected')}</p>
    </section>
  );
}
