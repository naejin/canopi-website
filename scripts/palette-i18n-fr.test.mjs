// French locale render & string integrity guard for North Star Palette Builder (Stage 2B.1).
// Verifies zero English fallbacks, zero stratum jargon ("(emergent)"/"(émergent)"), zero raw KTMPR,
// and localized scenarios/units/reasons when rendering helpers in French.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const ROOT = process.cwd();
const fr = JSON.parse(readFileSync(join(ROOT, 'src/i18n/translations/fr.json'), 'utf8'));
const frStrings = Object.fromEntries(
  Object.entries(fr)
    .filter(([k]) => k.startsWith('consortium.') && !k.startsWith('consortium.block.'))
    .map(([k, v]) => [k.slice('consortium.'.length), v]),
);

const { setStrings } = await import('../src/islands/palette/strings.ts');
const { REPORT_SCENARIOS } = await import('../src/lib/palette/report.ts');
const {
  frostSourceLabel,
  lightSpanLabel,
  localizedReason,
  scenarioLabel,
  scenarioShort,
  traitFieldLabel,
} = await import('../src/islands/palette/views/north-star/ns-helpers.ts');

test('fr locale: scenarios, frost sources, light spans, units and reasons contain no English leaks or stratum jargon', () => {
  setStrings(frStrings, 'fr');

  // 1. All 10 scenarios localized in French
  for (const sc of REPORT_SCENARIOS) {
    const sh = scenarioShort(sc.id);
    const lb = scenarioLabel(sc.id);
    assert.ok(!/\b(Today|what-if|middle road|low emissions|high emissions|Drought)\b/i.test(sh), `fr scenarioShort(${sc.id}) leaked English: ${sh}`);
    assert.ok(!/\b(Today|what-if|middle road|low emissions|high emissions|colder|hotter|drought)\b/i.test(lb), `fr scenarioLabel(${sc.id}) leaked English: ${lb}`);
  }

  // 2. "Layer is light": no stratum word in fr lightSpanLabel
  const fakeTaxon = {
    light: { sunniest: 'emergent', shadiest: 'medium', preferred: 'emergent' },
    stratum: { value: 'emergent' },
    traits: { sun: true, semi_shade: true, full_shade: false, soil_ph: { min: 6, max: 7.5 }, height_m: { min: 1, max: 5 } },
    climate: { tminCold: { low: -2 }, tmaxWarm: { high: 32 }, tmeanYear: { low: 10 }, tmeanWarm: { low: 18 } },
    extremes: { tminExtreme: { low: -8 }, tmaxExtreme: { high: 38 } },
  };
  const span = lightSpanLabel(fakeTaxon);
  assert.equal(span, 'Plein soleil – Mi-ombre');
  assert.ok(!/émergent|emergent|canop/i.test(span), `stratum leaked into lightSpanLabel: ${span}`);

  // 3. Frost source human-readable (no KTMPR)
  const dormant = frostSourceLabel('ktmpr', 'ecocrop');
  assert.equal(dormant, 'FAO EcoCrop, dormance');
  assert.ok(!/ktmp/i.test(dormant));

  // 4. Trait field labels human-readable (no snake_case)
  assert.equal(traitFieldLabel('sun_exposure_shadiest'), 'Exposition la plus ombragée');
  assert.equal(traitFieldLabel('habit'), 'Port de la plante');

  // 5. Units localized
  assert.equal(fr['consortium.ns.unit.dayShort'], 'j');
  assert.equal(fr['consortium.ns.unit.mmYear'], 'mm/an');

  // 6. Verdict reason localized
  const eff = { tminColdC: -6, tmaxWarmC: 36, tmeanYearC: 8, tmeanWarmC: 15, freeze10C: -12, heat10C: 42, soilPh: 8.1, subsoilPh: 8.3, cddDays: 35, tankDays: 20, clayPct: 40, roomLimitM: 3 };
  const reasonFr = localizedReason({ code: 'extreme_freeze', severity: 'at_risk', detail: 'English fallback' }, eff, fakeTaxon);
  assert.ok(reasonFr.includes('Gel décennal'), `expected French reason, got: ${reasonFr}`);
  assert.ok(!/below observed extreme/i.test(reasonFr));

  // 7. North Star Studio strings localized in French (zero English leaks for Guild Pulse, jobs, Atlas, Dossier, Arrival)
  const frMustLocalize = [
    'consortium.ns.arrival.title',
    'consortium.ns.arrival.allFit',
    'consortium.ns.arrival.waterTankSub',
    'consortium.ns.pulse.headline',
    'consortium.ns.pulse.crownBudget',
    'consortium.ns.pulse.robustness',
    'consortium.ns.jobs.backedUp',
    'consortium.ns.jobs.coveredBy',
    'consortium.ns.board.filterPlaceholder',
    'consortium.ns.elev.caption',
    'consortium.ns.cal.both',
    'consortium.ns.atlas.pillarsStrong',
    'consortium.ns.atlas.dualPh',
    'consortium.ns.atlas.clickHorizon',
    'consortium.ns.swaps.title',
    'consortium.ns.swaps.compare',
  ];
  const en = JSON.parse(readFileSync(join(ROOT, 'src/i18n/translations/en.json'), 'utf8'));
  for (const key of frMustLocalize) {
    assert.ok(typeof fr[key] === 'string' && fr[key].length > 0, `missing fr key ${key}`);
    assert.notEqual(fr[key], en[key], `fr key ${key} fell back to English: ${fr[key]}`);
  }
});
