/** @jsxImportSource preact */
// "Against your place" (PP-C c2, slices 3.4; boards Details, DetailsMore, DetailsDesk): one plant's
// verdict in words, the first section of Details. The fit line, then each factor with the limiting one
// first (the place's value against the plant's band), the notes, the placement's hedges, and what the
// plant's own later period changes; every word from core verdict-line.ts (againstLines). The verdict
// rule comes from the store (store.verdictRule, its own chunk, role `verdict`): this file never
// imports verdict.ts, so the details chunk stays off the rule (K3). Until the rule is here the section
// says it is checking; when its chunk failed, "Not checked" with Try again (Reload when only a reload
// can work, store.verdictNeedsReload; 3.1).
import { useEffect } from 'preact/hooks';
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import type { Line, PlantVerdict, Scenario, Taxon } from '../../../../lib/consortium/index.ts';
import { againstLines, levelLine, lineTerm, periodName, scenarioName } from '../../../../lib/consortium/index.ts';
import { say } from '../kit/fit.tsx';

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

export function Against({ t }: { t: Taxon }) {
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
  const entries = againstLines(v, store.laterVerdictOf(t, v), { period: periodName, scenario, heightM: t.traits.height_m?.max ?? null });
  const [fit, ...rest] = entries;
  return (
    <section class="ct-against" data-against aria-labelledby="ct-d-against">
      {head}
      <p class="ct-against-fit" data-level={fit.level}><Words line={fit.line} terms /></p>
      {rest.length > 0 && (
        <ul class="ct-against-lines">
          {rest.map((e) => (
            <li data-factor={e.factor} data-level={e.level} data-note={e.note} data-later={e.later ? "" : undefined} data-conf={e.conf} data-no-site={e.noSite ? "" : undefined}>
              <Words line={e.line} terms={!e.later} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
