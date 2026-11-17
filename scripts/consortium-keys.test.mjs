// The consortium tool's words (design check §6, H9): every consortium.* key in the locale files is
// asked for by the island or its page, and every key the island asks for by name exists in all 11
// files. A key is asked for when the island names it in T('…') or P('…'), matches a template key
// (`phase.${p}.plain`), is in INDIRECT below (a key held in a table and passed to T later), or is read
// by ConsortiumPage.astro. The same holds for the site-wide correction.* keys the island's form uses.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../src/', import.meta.url).pathname;
const locales = readdirSync(join(root, 'i18n/translations')).filter((f) => f.endsWith('.json'));
const words = Object.fromEntries(locales.map((f) => [f.slice(0, -5), JSON.parse(readFileSync(join(root, 'i18n/translations', f), 'utf8'))]));
const island = readdirSync(join(root, 'islands/consortium'), { recursive: true }).filter((f) => /\.(ts|tsx)$/.test(f))
  .map((f) => readFileSync(join(root, 'islands/consortium', f), 'utf8')).join('\n');
const page = readFileSync(join(root, 'components/consortium/ConsortiumPage.astro'), 'utf8');
const short = Object.keys(words.en).filter((k) => k.startsWith('consortium.') && !k.startsWith('consortium.block.')).map((k) => k.slice(11));

const templates = [...island.matchAll(/`([a-z][\w.]*\$\{[^`]*)`/g)].map((m) => m[1].replace(/\$\{[^}]*\}/g, '\u0000'))
  .filter((b) => /^[\w.\u0000]+$/.test(b)).map((b) => new RegExp(`^${b.replace(/\./g, '\\.').replace(/\u0000/g, '[\\w-]+')}$`));
// 'correction.…' and 'climate.…' in the island are the site-wide keys of those names, never consortium.*.
const siteWide = (k) => /^(correction|climate)\./.test(k);
// The quoted keys in the first argument of every T( or P( call (a ternary names two).
function namedKeys(src) {
  const out = new Set();
  for (const m of src.matchAll(/\b[TP]\(/g)) {
    let depth = 0, i = m.index + m[0].length, arg = '';
    for (; i < src.length; i++) {
      const c = src[i];
      if (depth === 0 && (c === ',' || c === ')')) break;
      if (c === '(' || c === '[' || c === '{') depth++;
      if (c === ')' || c === ']' || c === '}') depth--;
      arg += c;
    }
    for (const q of arg.matchAll(/'([\w.]+)'/g)) out.add(q[1]);
  }
  return out;
}
const named = namedKeys(island);
// Keys the island holds in a table and passes to T later, each checked to be in the sources: the
// layer values' labels (views/layers.ts), the load screens (App.tsx), the correction form's errors and
// results (views/Correction.tsx).
const INDIRECT = [
  't.bloom', 't.fruit', 't.sowing', 't.wind',
  'load.tooOld', 'load.wasmBlocked', 'load.toolFailed', 'load.fetch', 'load.damaged', 'load.stale',
  'correction.fieldError', 'correction.proposedError', 'correction.unchanged', 'correction.tooLong', 'correction.emailError',
  'correction.consentError', 'correction.invalid', 'correction.failed', 'correction.refused', 'correction.offline',
];
// The site-fit vocabulary (src/lib/consortium/site.ts siteFitMessages) writes its keys as quoted
// strings; views/kit/flags.ts passes each message's key to T. (The P5 mark providers that wrote theirs
// the same way were deleted in PP-C c2.)
const markSource = readFileSync(join(root, 'lib/consortium/site.ts'), 'utf8');
const markKeys = new Set([...markSource.matchAll(/'([a-z]\w*(?:\.\w+)+)'/g)].map((m) => m[1]));
const fromPage = new Set([...page.matchAll(/\b(?:tr|P)\('([\w.]+)'/g)].map((m) => m[1]));
const asked = (k) => named.has(k) || markKeys.has(k) || INDIRECT.includes(k) || fromPage.has(k) || templates.some((re) => re.test(k));

test('no consortium key is left unused (H9)', () => {
  assert.deepEqual(short.filter((k) => !asked(k)), []);
});

test('no correction.* key is left unused', () => {
  const correction = Object.keys(words.en).filter((k) => k.startsWith('correction.'));
  assert.ok(correction.length > 10);
  assert.deepEqual(correction.filter((k) => !asked(k)), []);
});

test('every INDIRECT key is written in the island as a quoted string', () => {
  for (const k of INDIRECT) assert.ok(island.includes(`'${k}'`), k);
});

test('every key the island asks for by name is in all 11 locale files', () => {
  const direct = new Set([...island.matchAll(/\b[TP]\('([\w.]+)'/g)].map((m) => m[1]));
  assert.ok(direct.size > 200);
  for (const [lang, w] of Object.entries(words)) {
    const missing = [...direct].filter((k) => !(siteWide(k) ? k in w : `consortium.${k}` in w));
    assert.deepEqual(missing, [], lang);
  }
});

// Walk-through 2, N7: words that state a rule say the rule the code has. The room sizes Suggest
// (suggest.ts SIZE_LIMIT: 6, 9, 12 plants) and never leaves a plant out (taller ones get a note), so
// the hint names the sizes in every locale and no longer says "never how many". The Beta line counts
// the curated lists and says the other climates borrow the nearest one, checked against a location.
test('the room hint and the Beta line say what the tool does, in all 11 locales', async () => {
  const { SIZE_LIMIT } = await import('../src/lib/consortium/suggest.ts');
  const sizes = [...new Set(Object.values(SIZE_LIMIT))].sort((a, b) => a - b);
  assert.deepEqual(sizes, [6, 9, 12]);
  for (const [lang, w] of Object.entries(words)) {
    const hint = w['consortium.site.roomHint'];
    for (const n of sizes) assert.match(hint, new RegExp(`(^|\\D)${n}(\\D|$)`), `${lang}: the room hint names ${n}`);
    for (const form of w['consortium.betaNote'].split(' | ')) assert.ok(form.includes('#'), `${lang}: every Beta form counts the lists`);
  }
  assert.doesNotMatch(words.en['consortium.site.roomHint'], /never how many/);
  assert.match(words.en['consortium.betaNote'], /nearest list/);
});

// ---- measures (PP-B commit 0; plant-palette-architecture 3 "Names and numbers") ----
// New consortium keys take a measure preformatted by format.ts ({len}, {area}, {depth}, {temp},
// {tempDiff}) and never write a unit after a placeholder: the unit then follows the language's own
// rules (Intl style 'unit') and one switch point could change units. The keys below wrote one before
// the policy; each moves when its stream rewrites it (and leaves this list), never a new one joins.
const UNIT_AFTER_PLACEHOLDER = /\{\w+\}\s?(m²|m2|cm|mm|km|ha|m|°C|°F|м|см|米|メートル|미터)(?![\p{L}\p{N}²])/u;
const UNIT_KEYS_BEFORE_POLICY = new Set([
  'meters', 'room.tall', 'side.height', 'side.metres', 'details.heightV', 'location.why', 'location.meansNear',
  'range.pool.count', 'range.empty.body',
]);
test('no new consortium key writes a unit after a placeholder, in any locale (format.ts measures)', () => {
  for (const [lang, w] of Object.entries(words)) {
    for (const [k, v] of Object.entries(w)) {
      if (!k.startsWith('consortium.') || typeof v !== 'string' || UNIT_KEYS_BEFORE_POLICY.has(k.slice(11))) continue;
      assert.doesNotMatch(v, UNIT_AFTER_PLACEHOLDER, `${lang} ${k}: "${v}" writes a unit after a placeholder; pass {len}, {area}, {depth}, {temp} or {tempDiff} from format.ts`);
    }
  }
  for (const k of UNIT_KEYS_BEFORE_POLICY) assert.ok(`consortium.${k}` in words.en, `${k} is gone: take it off UNIT_KEYS_BEFORE_POLICY`);
});

test('format.ts measures: the unit in the language\'s own form; a difference is signed; an area is " m²"', async () => {
  const f = await import('../src/islands/consortium/format.ts');
  const sp = (s) => s.replace(/[  ]/g, ' ');
  assert.equal(f.formatLength(2.5, 'en'), '2.5 m');
  assert.equal(sp(f.formatLength(2.5, 'fr')), '2,5 m');
  assert.equal(f.formatDepthCm(30.4, 'en'), '30 cm');
  assert.equal(sp(f.formatTemp(-3.5, 'fr')), '-3,5 °C');
  assert.match(f.formatTemp(-3.5, 'en'), /^-3\.5 ?°C$/);
  assert.match(f.formatTempDiff(2, 'en'), /^\+2 ?°C$/, 'a difference is signed');
  assert.match(f.formatTempDiff(0, 'en'), /^0 ?°C$/, 'no sign on zero');
  assert.equal(f.formatArea(1200, 'en'), '1,200 m²');
  assert.equal(sp(f.formatArea(1200, 'fr')), '1 200 m²');
});

test('parsePlotSize: whole square metres 1 to MAX_PLOT_M2 in the language\'s separators, else null', async () => {
  const { parsePlotSize } = await import('../src/islands/consortium/format.ts');
  const { MAX_PLOT_M2 } = await import('../src/lib/consortium/index.ts');
  const cases = [
    ['120', 'en', 120], ['1,200', 'en', 1200], ['1 200', 'fr', 1200], ['1 200', 'fr', 1200], ['1.200', 'de', 1200],
    ['120 m²', 'en', 120], ['12.5', 'en', 13], ['12,5', 'fr', 13], [String(MAX_PLOT_M2), 'en', MAX_PLOT_M2],
    ['', 'en', null], ['0', 'en', null], ['-5', 'en', null], [String(MAX_PLOT_M2 + 1), 'en', null], ['abc', 'en', null], ['12a', 'en', null],
  ];
  for (const [text, lang, want] of cases) assert.equal(parsePlotSize(text, lang), want, `${JSON.stringify(text)} in ${lang}`);
  const src = readFileSync(join(root, 'islands/consortium/format.ts'), 'utf8');
  assert.match(src, new RegExp(`const MAX_PLOT_M2 = ${MAX_PLOT_M2.toLocaleString('en').replace(/,/g, '_')};`), 'format.ts pins the core MAX_PLOT_M2');
});

// PP-C commit 0 (slices 3.2; replaces the cross-stream "every line comes from verdict-line" test): the
// verdict, hole and year words (consortium.line.*) are chosen in core verdict-line.ts only; a view
// says the Line it is given (views/kit/fit.tsx say, which strips the prefix and writes `line.${name}`
// as a template). So no other file of the island or the core writes "consortium.line." or asks T or P
// for a named 'line.…' key (a plant with no verdict says verdict-line.ts levelLine, PP-C c2).
const sources = (dir) => readdirSync(join(root, dir), { recursive: true }).filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => [`${dir}/${f}`, readFileSync(join(root, dir, f), 'utf8')]);
test('PP-C0-keys (policy, c2): no consortium.line. key is written outside core verdict-line.ts', () => {
  const stray = [...sources('islands/consortium'), ...sources('lib/consortium')]
    .filter(([f]) => f !== 'lib/consortium/verdict-line.ts')
    .filter(([, src]) => src.includes('consortium.line.') || /\b[TP]\(\s*['"`]line\.\w/.test(src))
    .map(([f]) => f);
  assert.deepEqual(stray, [], `consortium.line.* keys written outside verdict-line.ts: ${stray.join(', ')}`);
});
