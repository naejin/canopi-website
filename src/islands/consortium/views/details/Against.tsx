/** @jsxImportSource preact */
// "Against your place" (PP-C c2, slices 3.4; boards Details, DetailsMore, DetailsDesk): one plant's
// verdict in words, the first section of Details. The fit line, then each factor with the limiting one
// first (the place's value against the plant's band), the notes, the placement's hedges, and what the
// plant's own later period changes; every word from core verdict-line.ts (againstLines). The verdict
// rule comes from the store (store.verdictRule, its own chunk, role `verdict`): this file never
// imports verdict.ts, so the details chunk stays off the rule (K3). Until the rule is here the section
// says it is checking; when its chunk failed, "Not checked" with Reload (3.1).
import * as store from '../../store.ts';
import { T } from '../../strings.ts';
import type { Line, PlantVerdict, Scenario, Taxon } from '../../../../lib/consortium/index.ts';
import { againstLines, levelLine, lineTerm, periodIds, periodName, scenarioName } from '../../../../lib/consortium/index.ts';
import { say } from '../kit/fit.tsx';

// The plant's verdict for the page period, from the store's maps when it is there (members, the pool),
// else computed for this plant alone (a plant opened from a link or a guest list).
function verdictOf(t: Taxon): PlantVerdict | null {
  const rule = store.verdictRule.value;
  if (!rule) return null;
  return store.memberVerdicts.value?.get(t.id) ?? store.poolVerdicts.value?.get(t.id) ?? rule.verdicts([t], store.verdictContext.value).get(t.id) ?? null;
}
// The verdict at the plant's own later period (the rule's judgedPeriod for the last period: its own
// years, today for a short-lived plant), when the page shows an earlier one.
function laterOf(t: Taxon, v: PlantVerdict): PlantVerdict | null {
  const rule = store.verdictRule.value;
  const own = rule?.judgedPeriod(t, periodIds[periodIds.length - 1]);
  if (!rule || !own || own === v.judged) return null;
  return rule.verdicts([t], { ...store.verdictContext.value, period: own }).get(t.id) ?? null;
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
              <p class="ct-muted">{T('details.loadFailed')}</p>
              <p><button type="button" class="button button-secondary" onClick={() => (store.verdictNeedsReload.peek() ? location.reload() : store.retryVerdict())}>{T('details.reload')}</button></p>
            </>
          : <p class="ct-muted">{T('details.checking')}</p>}
      </section>
    );
  }
  const scenario = scenarioName(store.verdictContext.value.scenario as Scenario);
  const entries = againstLines(v, laterOf(t, v), { period: periodName, scenario, heightM: t.traits.height_m?.max ?? null });
  const [fit, ...rest] = entries;
  return (
    <section class="ct-against" data-against aria-labelledby="ct-d-against">
      {head}
      <p class="ct-against-fit" data-level={fit.level}><Words line={fit.line} terms /></p>
      {rest.length > 0 && (
        <ul class="ct-against-lines">
          {rest.map((e) => (
            <li data-factor={e.factor} data-level={e.level} data-note={e.note} data-later={e.later ? '' : undefined} data-conf={e.conf}>
              <Words line={e.line} terms={!e.later} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
