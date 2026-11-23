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
import { english, locale, LOCALES } from './consortium-pf-env.mjs';

const core = await import('../src/lib/palette/index.ts');
const { en, say } = await english();

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

// ---- final1 fixes (PFA-B1, PFA-B3, PFA-B7, N7) ----

test('PFA-B1 a second look says its own reason: "Near the edge of its range" only for a range edge; a wetter place or a spot misfit names that cause, never the edge', () => {
  const look = (limiting) => ({ id: 'x', judged: '1981-2010', ownYears: false, level: 'look', limiting, factors: [limiting], notes: [], range: 'judged' });
  const edge = look({ factor: 'hot', level: 'look', basis: 'range', place: 31, low: null, high: 30, confidence: { term: 'edge' } });
  assert.equal(say(core.lookChipLine(edge)), 'Near the edge of its range', 'a range side within the margin: the edge chip (BC11)');
  const wet = look({ factor: 'dry', level: 'look', basis: 'range', place: 1.4, low: 0.2, high: 0.9 });
  assert.equal(say(core.lookChipLine(wet)), 'wetter here than where it is recorded', 'past the wet end of its band: the cause, not the edge');
  const spot = look({ factor: 'light', level: 'look', basis: 'spot', place: null, low: null, high: null });
  assert.equal(say(core.lookChipLine(spot)), 'the light here is not what it needs', 'a spot misfit: the spot\'s words');
  assert.equal(core.lookChipLine({ ...edge, level: 'fits' }), null, 'a fit carries no look chip');
  assert.equal(core.lookChipLine({ ...edge, limiting: null }), null, 'nothing limiting named: no chip (the fit line says it)');
});

test('PFA-B3 the bulk note\'s figure is the goal the sentence explains (core addGoal, the figure bestToAdd takes), never the number picked', () => {
  const ground = hole('job:ground:0-60');
  const thin = hole('job:feeds_you:15-60', { thin: { have: 1, want: 3 } });
  assert.equal(core.addGoal(ground, { plantsPerJob: 2 }), 2, 'a hole: the Plants per job');
  assert.equal(core.addGoal(thin, { plantsPerJob: 3 }), 2, 'a thin job: want less have');
  const one = { fits: [{ id: 'a' }], look: [], outside: [], unknown: [] };
  assert.deepEqual(core.bestToAdd(ground, one, { plantsPerJob: 2 }), ['a'], 'only 1 fits: 1 picked, the goal still 2');
  for (const l of LOCALES) {
    const s = locale(l);
    for (const k of ['bulkPicksHole', 'bulkPicksHoleFewer', 'bulkPicksThin', 'bulkPicksThinFewer', 'bulkMarkOf', 'bulkRest', 'restLook', 'restOutside', 'restUnchecked', 'otherParts', 'countUncheckedLists']) assert.ok(s[`consortium.palette.next.${k}`], `${l}: consortium.palette.next.${k}`);
    assert.equal(s['consortium.palette.next.bulkMarkMore'], undefined, `${l}: "Among the others …" is gone (N6)`);
    assert.equal(s['consortium.palette.next.otherUnchecked'], undefined, `${l}: the unchecked-only form is gone (PFA-R3: one ordered rule, otherParts)`);
  }
});

test('PFA-B7 a toast with no target names no narrowed hole (plain Find: "Pinto peanut added."); a new hole is still said', () => {
  const shade = hole('light:low:0-60'), shadeAfter = hole('light:low:15-60');
  const ground = hole('job:ground:0-60'), groundAfter = hole('job:ground:25-60');
  const c = core.holeChange([shade, ground], [shadeAfter, groundAfter]);
  assert.deepEqual(core.holeChangeLines(c, { left: false, target: 'none' }).filter((l) => !l.key.endsWith('.holesNoNew')).map(say), [], 'board Toasts: the Added line only');
  const opened = core.holeChange([shade], [shade, ground]);
  assert.equal(core.holeChangeLines(opened, { left: false, target: 'none' }).filter((l) => l.key.endsWith('.holesNew')).length, 1, 'a new hole is said');
});

test('N7 the Portuguese invasive chip reads without a bare "em" before the country ("em Brasil" is wrong; board: "no Brasil")', () => {
  const pt = locale('pt')['consortium.find.invasiveShort'];
  assert.doesNotMatch(pt, /\bem \{country\}/, `pt: ${pt}`);
  assert.equal(pt.replace('{country}', 'Brasil'), 'Registrada como invasora: Brasil');
});

// ---- final3 fixes (PFA-R3/F5, R4, R5, F4) ----

test('PFA-R5, PFA-G1 one group rule for the card and the sheet: core fillers and Find\'s findGroups put each plant in the same group; a warned plant is a second look whatever its level but outside (pf-decisions "Toxic counts as a second look"), a warned fit too', async () => {
  const { taxon } = await import('./consortium-p5-fixtures.mjs');
  const { findGroups } = await import('../src/islands/palette/rules/find-query.ts');
  const h = hole('light:emergent:0-60');
  const ids = ['fit', 'fitWarned', 'unknownWarned', 'unknown', 'look', 'outsideWarned', 'none'];
  const taxa = ids.map((id) => taxon({ id, canonical_name: id }));
  const level = { fit: 'fits', fitWarned: 'fits', unknownWarned: 'unknown', unknown: 'unknown', look: 'look', outsideWarned: 'outside' };
  const verdicts = new Map(Object.entries(level).map(([id, l]) => [id, { id, level: l, judged: '1991-2020', ownYears: false, limiting: null, factors: [], notes: [] }]));
  const warned = new Set(['fitWarned', 'unknownWarned', 'outsideWarned']);
  assert.ok(taxa.every((t) => core.fills(h, t)), 'every fixture fills the hole');
  const card = core.fillers(h, taxa, verdicts, new Map(), warned, []);
  const sheet = findGroups(taxa, verdicts, warned);
  const ids2 = (g) => g.map((t) => t.id).sort();
  assert.deepEqual(ids2(card.fits), ids2(sheet.fits), 'fits');
  assert.deepEqual(ids2(card.look), ids2(sheet.look), 'needs a second look');
  assert.deepEqual(ids2(card.outside), ids2(sheet.outside), 'outside');
  assert.deepEqual(ids2(card.unknown), ids2(sheet.unchecked), 'not checked');
  assert.ok(card.look.some((t) => t.id === 'unknownWarned'), 'a warned plant with no range recorded keeps its warning: a second look');
  assert.deepEqual(ids2(card.unknown), ['none', 'unknown'], 'only the unwarned plants never judged is "not checked" (unknown is never a hole)');
  assert.ok(card.outside.some((t) => t.id === 'outsideWarned'), 'a warned plant outside its range stays outside');
  assert.ok(card.look.some((t) => t.id === 'fitWarned'), 'a warned fit needs a second look');
  for (const id of ids) assert.equal(core.fillerGroup(verdicts.get(id)?.level, warned.has(id)), Object.entries(card).find(([, g]) => g.some((t) => t.id === id))[0], `fillerGroup(${id})`);
});

test('PFA-R4 the plants on the lists not checked read apart from the palette\'s own "N plants not checked": "3 on your lists not checked", in every locale', () => {
  assert.equal(locale('en')['consortium.palette.next.countUncheckedLists'], 'one: # on your lists not checked | other: # on your lists not checked');
  for (const l of LOCALES) {
    const s = locale(l);
    assert.notEqual(s['consortium.palette.next.countUncheckedLists'], s['consortium.palette.next.countUnchecked'], `${l}: worded apart from the bare count`);
    assert.match(s['consortium.palette.next.otherParts'], /\{hole\}.*\{parts\}/, `${l}: otherParts`);
  }
});

test('PFA-F4 the pt and de rest sentence uses the word map\'s second-look words (row 89: "Vale olhar de perto", "Genauer ansehen")', () => {
  const pt = locale('pt')['consortium.palette.next.restLook'], de = locale('de')['consortium.palette.next.restLook'];
  assert.match(pt, /olhar de perto/, `pt: ${pt}`);
  assert.doesNotMatch(pt, /segundo olhar/, `pt: ${pt}`);
  assert.match(de, /genauer anzusehende/, `de: ${de}`);
  assert.doesNotMatch(de, /zweiten Blick/, `de: ${de}`);
});

test('PFA-G5 the German rest sentence has no unclosed relative clause: restLook alone and before restUnchecked inside bulkRest', () => {
  const de = locale('de'), k = (x) => de[`consortium.palette.next.${x}`];
  const form = (key, n) => { const m = Object.fromEntries(k(key).split(' | ').map((f) => f.split(': '))); return (m[n === 1 ? 'one' : 'other'] ?? m.other).replace('#', String(n)); };
  for (const parts of [[form('restLook', 15)], [form('restLook', 1)], [form('restLook', 15), form('restUnchecked', 3)]]) {
    const sentence = form('bulkRest', 18).replace('{parts}', parts.join(' und ')).replace('{link}', 'Alle 23 Pflanzen ansehen');
    assert.doesNotMatch(sentence, /, die /, `no relative clause left open: ${sentence}`);
  }
  assert.equal(form('restLook', 15), 'die 15 genauer anzusehenden');
  assert.equal(form('restLook', 1), 'die 1 genauer anzusehende');
});
