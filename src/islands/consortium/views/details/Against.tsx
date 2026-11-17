/** @jsxImportSource preact */
// "Against your place" (PP-C c2, slices 3.4; boards Details, DetailsMore, DetailsDesk): one plant's
// verdict in words, the first section of Details. The fit line, then each factor with the limiting one
// first (the place's value against the plant's band), the notes, the placement's hedges, and what the
// plant's own later period changes; every word from core verdict-line.ts (againstLines). The verdict
// rule comes from the store (store.verdictRule, its own chunk, role `verdict`): this file never
// imports verdict.ts, so the details chunk stays off the rule (K3). Until the rule is here the section
// says it is checking; when its chunk failed, "Not checked" with Try again (Reload when only a reload
// can work, store.verdictNeedsReload; 3.1). Each measured factor draws today's band above its line
// (B1, slices 3.7): where the plant is recorded growing, the place's marker (a dot; a ring for the
// plant's own later period) and the other source's limit dashed (core limitOf over the details'
// disputes); the band itself dashed when its records are few. The drawing is aria-hidden: the line
// under it is its text form.
import { useEffect } from 'preact/hooks';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import type { Dispute, Factor, FactorVerdict, Line, PlantVerdict, Scenario, Taxon } from '../../../../lib/consortium/index.ts';
import { againstLines, levelLine, limitOf, lineTerm, periodName, scenarioName } from '../../../../lib/consortium/index.ts';
import { say } from '../kit/fit.tsx';
import { formatNumber, formatTemp } from '../../format.ts';
import { pageLang } from '../../strings.ts';

// The disputed bound each band can carry (Dispute.field).
const DISPUTED: Partial<Record<Factor, Dispute['field']>> = { cold: 'tmin_cold.low', cool: 'tmean_year.low' };
const pct = (x: number, lo: number, hi: number) => `${(((x - lo) / (hi - lo)) * 100).toFixed(1)}%`;

// One factor's band (aria-hidden; the line under it says it in words).
function Band({ f, later, few, disputes }: { f: FactorVerdict; later: FactorVerdict | null; few: boolean; disputes: readonly Dispute[] }) {
  if (f.place === null || f.low === null || f.high === null || f.basis !== 'range') return null;
  const field = DISPUTED[f.factor];
  const limit = field ? disputes.map((d) => (d.field === field ? limitOf(d) : null)).find((x) => x) ?? null : null;
  const marks = [f.low, f.high, f.place, later?.place ?? f.place, limit?.valueC ?? f.low];
  const span = Math.max(...marks) - Math.min(...marks) || 1;
  const lo = Math.min(...marks) - span * 0.08, hi = Math.max(...marks) + span * 0.08;
  const lang = pageLang();
  const num = (x: number) => (f.factor === 'dry' ? formatNumber(x, lang, 2) : formatTemp(x, lang));
  return (
    <div class="ct-band" aria-hidden="true" data-few={few || f.disputed ? '' : undefined}>
      <span class="ct-band-range" style={{ left: pct(f.low, lo, hi), width: pct(f.high - f.low + lo, lo, hi) }} />
      {limit && <span class="ct-band-limit" style={{ left: pct(limit.valueC, lo, hi) }} />}
      {later && later.place !== null && later.place !== f.place && <span class="ct-band-later" style={{ left: pct(later.place, lo, hi) }} />}
      <span class="ct-band-place" style={{ left: pct(f.place, lo, hi) }} />
      <span class="ct-band-num" style={{ left: pct(f.low, lo, hi) }}>{num(f.low)}</span>
      <span class="ct-band-num" style={{ left: pct(f.high, lo, hi) }}>{num(f.high)}</span>
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

export function Against({ t, disputes = [] }: { t: Taxon; disputes?: readonly Dispute[] }) {
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
  const entries = againstLines(v, later, { period: periodName, scenario, heightM: t.traits.height_m?.max ?? null });
  const few = v.records !== undefined; // core verdict.ts sets records only on few records
  const factorOf = (x: PlantVerdict | null, k?: Factor) => x?.factors.find((f) => f.factor === k) ?? null;
  const [fit, ...rest] = entries;
  return (
    <section class="ct-against" data-against aria-labelledby="ct-d-against">
      {head}
      <p class="ct-against-fit" data-level={fit.level}><Words line={fit.line} terms /></p>
      {rest.length > 0 && (
        <ul class="ct-against-lines">
          {rest.map((e) => (
            <li data-factor={e.factor} data-level={e.level} data-note={e.note} data-later={e.later ? "" : undefined} data-conf={e.conf} data-no-site={e.noSite ? "" : undefined}>
              {!e.later && e.factor && !e.note && factorOf(v, e.factor) && <Band f={factorOf(v, e.factor)!} later={factorOf(later, e.factor)} few={few} disputes={disputes} />}
              <Words line={e.line} terms={!e.later} />
            </li>
          ))}
        </ul>
      )}
      {v.factors.some((f) => f.basis === 'range' && f.place !== null && f.low !== null && f.high !== null) && <p class="ct-muted ct-small" data-band-key>{T('details.bandKey')}</p>}
    </section>
  );
}
