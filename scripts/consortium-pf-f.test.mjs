// pf stream f, "One plant" (chunk 3): the words pf-f owns in the core's verdict-line vocabulary,
// said in the locale files as the boards say them.
// - F2 (chunk 2 hand-off triage): the German thin spot reads "Dünn besetzt: nur 1 Pflanze von Jahr 1
//   bis Jahr 15." (board German), with no "Reserve finden" in its words (A20: thin rows carry no button).
// - M23 (chunk 2 hand-off triage; boards SiteMendoza and Find): a plant's rain line "recorded from
//   25 mm" / "registrada desde 25 mm", read from the low end of TaxonClimate.precip, never a guess.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const line = await import('../src/lib/consortium/verdict-line.ts');
const { formatMm } = await import('../src/islands/consortium/format.ts');
const dir = new URL('../src/i18n/translations/', import.meta.url);
const words = Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [f.slice(0, -5), JSON.parse(readFileSync(new URL(f, dir), 'utf8'))]));

// A Line in a language's words as the island says it (strings.ts P for a count, words.ts for a
// millimetre variable): the plural form for the count, # the number, then the {vars}.
function said(l, lang) {
  let text = words[lang][l.key];
  assert.ok(text, `${lang} has ${l.key}`);
  if (typeof l.count === 'number') {
    const forms = Object.fromEntries(text.split(' | ').map((f) => { const i = f.indexOf(': '); return [f.slice(0, i), f.slice(i + 2)]; }));
    text = (forms[new Intl.PluralRules(lang).select(l.count)] ?? forms.other).replace('#', String(l.count));
  }
  return text.replace(/\{(\w+)\}/g, (_, k) => (k.endsWith('Mm') ? formatMm(l.vars[k], lang) : String(l.vars[k])));
}

test('F2 (pf-f): the German thin spot as board German, with no "Reserve finden"', () => {
  const one = line.thinLine({ have: 1, fromYear: 1, toYear: 15 });
  assert.equal(said(one, 'de'), 'Dünn besetzt: nur 1 Pflanze von Jahr 1 bis Jahr 15.');
  assert.equal(said(line.thinLine({ have: 2, fromYear: 3, toYear: 9 }), 'de'), 'Dünn besetzt: nur 2 Pflanzen von Jahr 3 bis Jahr 9.');
  assert.doesNotMatch(words.de['consortium.line.thin'], /Reserve finden/);
});

test('M23 (pf-f): "recorded from N mm" from the low end of the plant\'s recorded rain; none without a rain range', () => {
  const t = (low) => ({ climate: { precip: low === undefined ? null : { low, median: null, high: null, count: null, basis: 'cells', blocks: null, lowSource: null, highSource: null, weak: false } } });
  const l = line.rainFromLine(t(24.6));
  assert.equal(said(l, 'es'), 'registrada desde 25 mm');
  assert.equal(said(l, 'en'), 'recorded from 25 mm');
  for (const lang of Object.keys(words)) assert.match(said(l, lang), /25/, `${lang} names the rain`);
  assert.equal(line.rainFromLine(t(undefined)), null, 'no rain range: no line');
  assert.equal(line.rainFromLine(t(null)), null, 'a rain range with no low: no line');
  assert.equal(line.rainFromLine({ climate: null }), null, 'no climate: no line');
});
