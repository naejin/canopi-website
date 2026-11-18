// pf stream a, "What's missing next", fix round 1: the core rules and words its screens read, tested at
// the lasting layer (core holes.ts and verdict-line.ts; the browser spec consortium-pf-a.browser.test.mjs
// tests the screens):
//   C5   the Next step's ranking rule: a cooler-months food hole leads when plants that fit fill it;
//   BC6  a toast names only the hole the add was for ("Covers the ground: nobody after year 25."), then
//        the holes left, never every other hole the plants narrowed;
//   BC1, BC26, C4  a candidate's fit reason: what it does and when, in the target's terms, how many holes
//        it fills ("Covers the ground and is planted in shade: fills 4 holes"), and on a thin job the
//        backup form ("Feeds you from year 3 to year 25: a backup"), never "fills this hole".
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const core = await import('../src/lib/consortium/index.ts');
const words = await import('../src/islands/consortium/words.ts');
const en = JSON.parse(readFileSync(new URL('../src/i18n/translations/en.json', import.meta.url), 'utf8'));
(await import('../src/islands/consortium/strings.ts')).setStrings(Object.fromEntries(Object.entries(en).filter(([k]) => k.startsWith('consortium.')).map(([k, v]) => [k.slice(11), v])), 'en');
const say = (l) => words.say(l);

const hole = (id, over = {}) => {
  const [kind, which, span] = id.split(':');
  const [fromYear, toYear] = span.split('-').map(Number);
  return { id, kind, rank: 1, ...(kind === 'job' ? { job: which } : kind === 'light' ? { stratum: which } : {}), fromYear, toYear, state: 'open', ...over };
};

test('C5 ranking: a cooler-months food hole leads the Next step when plants that fit fill it ("hole 1 of 3"); with none that fit, rank order stays (the full-sun hole first)', () => {
  const sun = hole('light:emergent:0-3', { rank: 2 });
  const soil = hole('job:feeds_soil:15-60', { rank: 4 });
  const cool = hole('cool::0-60', { rank: 5, job: 'feeds_you' });
  const list = [sun, soil, cool];
  const withFits = core.nextTarget(list, [], new Set(), (h) => h === cool);
  assert.equal(withFits.target, cool, 'the cool food hole first when fitting plants fill it');
  assert.deepEqual([withFits.kind, withFits.index, withFits.of], ['hole', 1, 3], 'its position reads "hole 1 of 3"');
  assert.equal(core.nextTarget(list, [], new Set(['cool::0-60']), (h) => h === cool).target, sun, 'put off: the rank order again');
  const none = core.nextTarget(list, [], new Set(), () => false);
  assert.equal(none.target, sun, 'no fitting plant: "Full sun: nobody in the first 3 years" first, by rank');
  assert.equal(core.targetPosition(list, [], soil, (h) => h === cool).index, 3, 'the others keep their order after the cool hole');
  assert.equal(core.nextTarget(list, []).target, sun, 'no fit test given: rank order');
});

test('BC6 toast words: an add for a hole names that hole only, as it is now, then the holes left; the other narrowed holes are not listed', () => {
  const ground = hole('job:ground:0-60'), groundAfter = hole('job:ground:25-60');
  const shade = hole('light:low:0-60'), shadeAfter = hole('light:low:15-60');
  const mulch = hole('job:mulch:0-60'), mulchAfter = hole('job:mulch:25-60');
  const other = hole('job:shelter:15-60');
  const c = core.holeChange([ground, shade, mulch, other], [groundAfter, shadeAfter, mulchAfter, other]);
  assert.equal(c.narrowed.length, 3);
  const lines = core.holeChangeLines(c, { left: true, target: ground }).filter((l) => !l.key.endsWith('.holesNoNew')).map(say);
  assert.deepEqual(lines, ['Covers the ground: nobody after year 25.', '4 holes left.'], 'board AddMany: "Covers the ground: nobody after year 25. 7 holes left."');
  const one = core.holeChangeLines(c, { left: false, target: ground }).filter((l) => !l.key.endsWith('.holesNoNew')).map(say);
  assert.deepEqual(one, ['Covers the ground: nobody after year 25.'], 'board FillHole: "Pineapple added. Covers the ground: nobody after year 15."');
  assert.equal(core.holeChangeLines(c, { left: false }).filter((l) => l.key.endsWith('.holeNow')).length, 3, 'without a target (a removal, a site edit) every narrowed hole is said');
});

test('BC1, BC26, C4 fit reason: what the candidate does and when, in the target\'s terms; how many holes it fills; a thin job\'s backup form', () => {
  const ground = hole('job:ground:0-60'), sun = hole('light:emergent:0-60');
  const thin = hole('job:feeds_you:15-60', { thin: { have: 1, want: 2 } });
  assert.equal(say(core.fillReasonLine(ground, { from: 0.25, to: 25 }, { light: 'low', holes: 4 })), 'Covers the ground and is planted in shade: fills 4 holes', 'board Palette, Pinto peanut');
  assert.equal(say(core.fillReasonLine(ground, { from: 1, to: 25 })), 'Covers the ground from year 1 to year 25', 'board Balcony: "Feeds the soil from year 1 to year 25"');
  assert.equal(say(core.fillReasonLine(ground, { from: 3, to: 60 }, { holes: 2 })), 'Covers the ground from year 3 to year 60: fills 2 holes');
  assert.equal(say(core.fillReasonLine(sun, { from: 3, to: null })), 'Planted in full sun from year 3 on', 'board SiteMendoza: "A pleno sol desde el año 3"; word map: "Planted in full sun from year 3 on"');
  const backup = say(core.fillReasonLine(thin, { from: 3, to: 25 }, { light: 'low', holes: 3 }));
  assert.equal(backup, 'Feeds you from year 3 to year 25: a backup', 'board AddMany: a thin job\'s row');
  assert.doesNotMatch(backup, /fill/, 'word map section 10: never "fills this hole" on a thin job');
  assert.equal(say(core.whenLine(0, 3)), 'in the first 3 years');
  assert.equal(say(core.whenLine(0.25, 3)), 'from month 3 to year 3');
  assert.equal(say(core.whenLine(0, 0.25)), 'in the first 90 days');
});

// ---- board check b3 (R3, BC29-BC31, BC34) ----
const locale = (l) => JSON.parse(readFileSync(new URL(`../src/i18n/translations/${l}.json`, import.meta.url), 'utf8'));
const LOCALES = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];

test('R3 the no-fit state is decided by the group counts: no plant that fits and none still to be checked', () => {
  const t = { id: 'x' };
  assert.equal(core.noneFits({ fits: [], look: [], unknown: [] }), true, 'board Many: nothing on the lists does it (outside ones apart)');
  assert.equal(core.noneFits({ fits: [], look: [], unknown: [t] }), false, 'a grower without a place: the plants were never judged, not found unfit');
  assert.equal(core.noneFits({ fits: [], look: [t], unknown: [] }), true, 'board Many: "no plant on your lists fits here and does this then; 4 need a second look"');
  assert.equal(core.noneFits({ fits: [t], look: [], unknown: [] }), false);
});

test('BC31 the dryness intro: said where a listed candidate carries the dryness note, never with "all year" watering or with no verdict', () => {
  const dry = { level: 'fits', limiting: { factor: 'dry' }, notes: [] };
  assert.equal(say(core.dryIntroLine([undefined, dry])), 'Little rain falls here: each plant says whether it may need watering.', 'board SiteMendoza: "Aquí llueve poco: cada planta dice si puede necesitar riego."');
  assert.equal(core.dryIntroLine([{ ...dry, watered: 'all-year' }]), null, 'watered all year: no note on the rows, no intro');
  assert.equal(core.dryIntroLine([{ level: 'fits', limiting: { factor: 'cold' }, notes: [] }, null]), null, 'nothing dry: no intro');
  assert.equal(core.dryIntroLine([{ ...dry, level: 'outside' }]), null, 'an outside plant is not a candidate row');
  for (const l of LOCALES) assert.ok(locale(l)['consortium.line.dryIntro'], `${l}: the intro`);
  assert.equal(locale('es')['consortium.line.dryIntro'], 'Aquí llueve poco: cada planta dice si puede necesitar riego.', 'board SiteMendoza, word for word');
});

test('BC31, BC29, BC30, BC34 the boards\' words: "También te alimenta" with no colon (es, pt), "Recorded invasive in …" (word map row 37), one Spanish second-look word for heading and rows, "falha 1 de 3" (Recife)', () => {
  assert.equal(locale('es')['consortium.find.also'], 'También {jobs}', 'board SiteMendoza: "También te alimenta, da acolchado, protege"');
  assert.equal(locale('pt')['consortium.find.also'], 'Também {jobs}');
  const en = locale('en');
  assert.equal(en['consortium.find.invasiveShort'], 'Recorded invasive in {country}', 'word map row 37: the chip');
  assert.equal(en['consortium.find.hideInvasive'], 'Hide plants recorded invasive in {country}', 'word map row 37: the filter');
  for (const [k, v] of Object.entries(en)) if (k.startsWith('consortium.')) assert.doesNotMatch(v, /[Rr]ecorded as invasive in \{country\}(?!\.)/, `${k}: never "Recorded as invasive in"`);
  const es = locale('es');
  assert.equal(es['consortium.palette.secondLook'], `${es['consortium.line.look']} ({n})`, 'es: the group heading reads as the rows ("Conviene mirarla de cerca (6)")');
  assert.doesNotMatch(JSON.stringify(es), /segunda mirada/, 'es: never "Requiere una segunda mirada"');
  assert.equal(locale('pt')['consortium.palette.holeOf'], 'falha {i} de {n}', 'board Recife: "falha 1 de 3"');
});
