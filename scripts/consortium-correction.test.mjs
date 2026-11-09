// "Suggest a correction" in the details sheet (src/scripts/consortium/correction.js, wired in app.js),
// run in the small browser (scripts/consortium-harness.mjs) on the invented fixture: the form opens
// from the sheet's last section, is prefilled with the plant, the facts shown, the value shown now,
// the release, the climate and the language, keeps what was typed across redraws, and shows its
// sending, sent and failed states with the focus where the reader needs it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { device, tab } from './consortium-harness.mjs';
import { correctionFields, checkCorrection, correctionBody, freshCorrection, plain, postCorrection } from '../src/scripts/consortium/correction.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const temperate = JSON.parse(read('scripts/fixtures/consortium/temperate.json'));
const en = JSON.parse(read('src/i18n/translations/en.json'));
const fr = JSON.parse(read('src/i18n/translations/fr.json'));
const apple = temperate.taxa.find((t) => t.canonical_name === 'Malus domestica');
const RELEASE = 'r-0123456789abcdef';

async function sheet(opts = {}) {
  const dev = device();
  const t = tab(dev, '/consortium/', { siteClimate: 'temperate', ...opts });
  const page = await t.load();
  await page.act('crop-add', apple.id);
  await page.act('suggest');
  await page.act('details', apple.id);
  return { dev, t, page };
}
const dlg = (page) => page.$('#ct-dialog');
const text = (page, sel) => (page.$(sel)?.textContent ?? '').replace(/\s+/g, ' ').trim();
const focusedFk = (page) => page.focused()?.attribs?.['data-fk'];
async function choose(page, sel, value) {
  const el = page.$(sel);
  el.focus(); el.value = value; el.dispatchEvent(new page.Event('change')); await page.settle();
}
async function tick(page, sel) {
  const el = page.$(sel);
  el.focus(); el.checked = true; el.attribs.checked = ''; el.dispatchEvent(new page.Event('change')); await page.settle();
}
// The value the facts list shows for a label, as text.
const factShown = (page, label) => {
  const dts = page.$$('#ct-dialog .facts dt');
  const dt = dts.find((d) => d.textContent.trim() === label);
  return dt ? dt.next.textContent.replace(/\s+/g, ' ').trim() : null;
};

test('the sheet ends with a closed "Suggest a correction" section; its button opens the form on the field select', async () => {
  const { page } = await sheet();
  const sections = page.$$('#ct-dialog .drawer-body > .d-section');
  const last = sections.at(-1);
  assert.ok(last.attribs.class.includes('d-correct'), 'the last section of the sheet');
  assert.equal(text(page, '#ct-corr-title'), en['correction.title']);
  const open = page.$('[data-act="corr-open"]');
  assert.equal(open.attribs['aria-expanded'], 'false');
  assert.equal(open.attribs['aria-controls'], 'ct-corr');
  assert.equal(page.$('#ct-corr'), null, 'no form until asked');
  await page.act('corr-open');
  assert.ok(page.$('form#ct-corr'));
  assert.equal(page.focused().attribs.id, 'ct-corr-field');
  // The facts the sheet shows, then layer, timing, name and something else.
  const options = page.$$('#ct-corr-field option').map((o) => o.attribs.value);
  assert.deepEqual(options, ['', 'habit', 'height_m', 'width_max_m', 'light', 'soil_ph', 'drought_tolerance', 'moisture_use', 'deciduous_evergreen', 'lifespan', 'nitrogen_fixer', 'stratum', 'phases', 'common_name', 'other']);
  // The consent line, the privacy note and the context it is sent with.
  assert.equal(text(page, '.corr-consent label'), en['correction.consent']);
  assert.equal(en['correction.consent'], 'I agree my suggestion is published under CC BY-SA 4.0');
  assert.equal(text(page, '#ct-corr-privacy'), en['correction.privacy']);
  const context = text(page, '.corr-context');
  for (const part of [RELEASE, 'Temperate', 'English', 'Apple']) assert.ok(context.includes(part), `${part} in "${context}"`);
});

test('choosing a field shows the value the sheet shows for it; an unknown one says so', async () => {
  const { page } = await sheet();
  await page.act('corr-open');
  await choose(page, '#ct-corr-field', 'height_m');
  assert.equal(text(page, '#ct-corr-current'), factShown(page, en['consortium.t.height']));
  assert.equal(page.focused().attribs.id, 'ct-corr-field', 'the focus stays on the select');
  await choose(page, '#ct-corr-field', 'other');
  assert.equal(text(page, '#ct-corr-current'), en['correction.unknown']);
});

test('sending with nothing filled in marks the fields, says why, sends nothing and focuses the first', async () => {
  const { page, dev } = await sheet();
  await page.act('corr-open');
  await page.act('corr-send');
  assert.equal(dev.posts.length, 0);
  assert.equal(page.focused().attribs.id, 'ct-corr-field');
  for (const id of ['field', 'proposed', 'consent']) {
    assert.equal(page.$(`#ct-corr-${id}`).attribs['aria-invalid'], 'true', id);
    assert.ok(page.$(`#ct-corr-${id}`).attribs['aria-describedby'].includes(`ct-corr-${id}-error`), id);
    assert.ok(!('hidden' in page.$(`#ct-corr-${id}-error`).attribs), id);
  }
  assert.equal(page.$('#ct-corr-email').attribs['aria-invalid'], 'false', 'the email is optional');
  assert.equal(text(page, '#ct-corr-status'), en['correction.invalid']);
});

test('a filled form survives a redraw, posts the prefilled report and shows the sent state with the focus on it', async () => {
  const { page, dev } = await sheet();
  await page.act('corr-open');
  await choose(page, '#ct-corr-field', 'height_m');
  const shown = factShown(page, en['consortium.t.height']);
  assert.ok(shown, 'the sheet shows a height');
  await page.type('#ct-corr-proposed', '3–6 m');
  await page.type('#ct-corr-note', 'My own trees');
  await page.type('#ct-corr-email', 'ada@example.org');
  await tick(page, '#ct-corr-consent');
  // Keep redraws the sheet from state: what was typed stays.
  await page.act('keep', apple.id);
  assert.equal(page.$('#ct-corr-proposed').attribs.value, '3–6 m');
  assert.equal(page.$('#ct-corr-note').textContent, 'My own trees');
  assert.ok('checked' in page.$('#ct-corr-consent').attribs);
  await page.act('corr-send');
  assert.equal(dev.posts.length, 1);
  const [{ method, headers, body }] = dev.posts;
  assert.equal(method, 'POST');
  assert.equal(headers['Content-Type'], 'application/json');
  assert.deepEqual(body, {
    plant_id: apple.id, plant_name: 'Malus domestica', field: 'height_m', current_value: shown,
    proposed_value: '3–6 m', note: 'My own trees', release_id: RELEASE, climate: 'temperate', locale: 'en', consent: true, email: 'ada@example.org', website: '',
  });
  assert.equal(page.$('form#ct-corr'), null, 'the form gives way to the thanks');
  assert.equal(text(page, '.corr-sent p'), en['correction.sent']);
  assert.equal(focusedFk(page), 'corr-sent');
  // Another report starts from a fresh form.
  await page.act('corr-again');
  assert.equal(page.$('#ct-corr-proposed').attribs.value, '');
  assert.equal(page.focused().attribs.id, 'ct-corr-field');
});

test('while sending the button is marked busy and a second press sends nothing more; a failure keeps the values and says so', async () => {
  const { page, dev } = await sheet();
  let release;
  dev.answer = () => new Promise((r) => { release = r; });
  await page.act('corr-open');
  await choose(page, '#ct-corr-field', 'other');
  await page.type('#ct-corr-proposed', 'It is a tree, not a shrub');
  await tick(page, '#ct-corr-consent');
  await page.act('corr-send');
  assert.equal(text(page, '#ct-corr-status'), en['correction.sending']);
  assert.equal(page.$('[data-act="corr-send"]').attribs['aria-disabled'], 'true');
  assert.equal(focusedFk(page), 'corr-send', 'the focus stays on the button');
  await page.act('corr-send');
  assert.equal(dev.posts.length, 1, 'one report');
  release({ status: 502, json: { ok: false, code: 'failed' } });
  await page.settle();
  assert.equal(text(page, '#ct-corr-status'), en['correction.failed']);
  assert.ok(page.$('#ct-corr-status').attribs.class.includes('is-error'));
  assert.equal(page.$('#ct-corr-proposed').attribs.value, 'It is a tree, not a shrub');
  assert.equal(page.$('[data-act="corr-send"]').attribs['aria-disabled'], undefined, 'ready to try again');
  assert.equal(focusedFk(page), 'corr-send');
  // A refused mail points elsewhere; Enter in a field sends too.
  dev.answer = () => ({ status: 502, json: { ok: false, code: 'refused' } });
  const form = page.$('form#ct-corr');
  form.dispatchEvent(new page.Event('submit'));
  await page.settle();
  assert.equal(dev.posts.length, 2);
  assert.equal(text(page, '#ct-corr-status'), en['correction.refused']);
});

test('Cancel closes the form back to its button; another plant\'s sheet starts closed and empty', async () => {
  const { page } = await sheet();
  await page.act('corr-open');
  await page.type('#ct-corr-proposed', 'x');
  await page.act('corr-cancel');
  assert.equal(page.$('form#ct-corr'), null);
  assert.equal(focusedFk(page), 'corr-open');
  await page.act('corr-open');
  assert.equal(page.$('#ct-corr-proposed').attribs.value, 'x', 'reopened as it was left');
  await page.escape();
  const other = page.$$('.plant[data-id]').map((el) => el.attribs['data-id']).find((id) => id !== apple.id);
  await page.act('details', other);
  assert.equal(page.$('form#ct-corr'), null);
  await page.act('corr-open');
  assert.equal(page.$('#ct-corr-proposed').attribs.value, '');
});

test('a page built with no release id has nothing to send: no section', async () => {
  const { page } = await sheet({ release: null });
  assert.ok(page.$('#ct-dialog .facts'));
  assert.equal(page.$('.d-correct'), null);
});

test('the form speaks the page language', async () => {
  const { page } = await sheet({ lang: 'fr' });
  assert.equal(text(page, '[data-act="corr-open"]'), fr['correction.open']);
  await page.act('corr-open');
  assert.equal(text(page, '.corr-consent label'), fr['correction.consent']);
  assert.ok(text(page, '.corr-context').includes('Français'));
  await page.act('corr-send');
  assert.equal(text(page, '#ct-corr-status'), fr['correction.invalid']);
});

test('the pure parts: fields, checks, body and server answers', async () => {
  const T = (k) => k;
  const fields = correctionFields(T, [{ field: 'height_m', label: 'Height', current: '2–4 m' }], { layer: 'High', timing: '', name: 'Apple' });
  assert.deepEqual(fields.map((f) => f.field), ['height_m', 'stratum', 'phases', 'common_name', 'other']);
  assert.equal(plain('<span class="unknown">a &amp; b</span> · &lt;c&gt;'), 'a & b · <c>');
  const c = { ...freshCorrection('id'), field: 'height_m', proposed: ' 2–4 m ', consent: true };
  assert.deepEqual(checkCorrection(c, fields), { proposed: 'correction.unchanged' });
  assert.deepEqual(checkCorrection({ ...c, proposed: '3 m', email: 'nope' }, fields), { email: 'correction.emailError' });
  const body = correctionBody({ ...c, proposed: '3 m' }, fields, { plantId: 'id', plantName: 'Malus domestica', release: RELEASE, climate: 'temperate', locale: 'en' });
  assert.equal(body.current_value, '2–4 m');
  assert.equal(body.consent, true);
  const answer = (status, json) => async () => ({ ok: status < 300, status, json: async () => json });
  assert.deepEqual(await postCorrection(answer(200, { ok: true, code: 'sent' }), body), { status: 'sent', message: null, errors: {} });
  assert.deepEqual(await postCorrection(answer(400, { ok: false, code: 'invalid', fields: { proposed_value: 'unchanged', email: 'pattern' } }), body), { status: 'failed', message: 'correction.invalid', errors: { proposed: 'correction.unchanged', email: 'correction.emailError' } });
  assert.equal((await postCorrection(answer(400, { ok: false, code: 'invalid', fields: { release_id: 'pattern' } }), body)).message, 'correction.failed', 'a field the reader cannot fix');
  assert.equal((await postCorrection(async () => { throw new Error('offline'); }, body)).message, 'correction.failed');
});

test('layout: the status line keeps its room, the honeypot is off screen, and the form fits a phone sheet', () => {
  const css = read('src/styles/consortium.css');
  assert.match(css, /\.ct \.corr-status \{[^}]*min-height:/, 'no shift when a status appears');
  assert.match(css, /\.ct \.corr-hp \{[^}]*position: absolute;[^}]*left: -10000px;/);
  assert.match(css, /@media \(max-width: 639px\) \{[^}]*\.ct \.corr-form (input|select|textarea)[^}]*font-size: 16px/, 'no zoom on focus on a phone');
});
