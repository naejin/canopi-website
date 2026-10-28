// The consortium tool's own wiring (src/scripts/consortium/app.js), run in a small browser
// (scripts/consortium-harness.mjs) on the invented fixture: what the reader sees after clicking,
// typing, reloading and going Back. Scale chunk A fix review F1–F9 (B2, B3, B5, B7, C8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { device, tab } from './consortium-harness.mjs';
import * as core from '../src/lib/consortium/index.ts';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const fixture = (name) => JSON.parse(read(`scripts/fixtures/consortium/${name}.json`));
const temperate = fixture('temperate'), tropical = fixture('tropical'), mediterranean = fixture('mediterranean');
const en = Object.fromEntries(Object.entries(JSON.parse(read('src/i18n/translations/en.json'))).filter(([k]) => k.startsWith('consortium.')).map(([k, v]) => [k.slice(11), v]));
const head = (s) => s.split('{')[0];
const hashOf = (t) => t.entry().url.hash;
const stateOf = (t) => core.decodeState(new URLSearchParams(hashOf(t).slice(1)), temperate, { tropical, mediterranean });
const apple = temperate.taxa.find((t) => t.canonical_name === 'Malus domestica');
const membersOn = (page) => [...page.$$('.plant[data-id]')].map((el) => el.attribs['data-id']);
const OWN_WORDS = /your main crop|you chose|you added/i;

// A temperate result built around Apple, made on its own device: the reader's own, or Ana's to send.
async function appleResult(dev = device(), opts = {}) {
  const t = tab(dev, '/consortium/', { siteClimate: 'temperate', ...opts });
  const page = await t.load();
  await page.act('crop-add', apple.id);
  await page.act('suggest');
  return { t, page, dev };
}
// A plant of another climate's list, with or without a warning against this consortium.
function otherPlant(members, site, flagged) {
  for (const [climate, file] of [['tropical', tropical], ['mediterranean', mediterranean]]) {
    for (const taxon of file.taxa) {
      if (temperate.taxa.some((t) => t.id === taxon.id)) continue;
      const f = core.flagsFor(temperate, taxon.id, members, { site, guests: [taxon], country: null, countryChecked: false });
      if (!!f?.flagged === flagged) return { climate, taxon };
    }
  }
  return null;
}
async function chooseCountry(page, code) {
  await page.act('open-place', 'country');
  await page.type('#ct-country-q', new Intl.DisplayNames(['en'], { type: 'region' }).of(code));
  await page.act('country', code);
}

// ---------- B7, F1, F4: main crops and other-list plants read the same for every reader ----------
test('F1: someone\'s link built around a crop the reader once chose reads neutrally, as the reader\'s own does', async () => {
  const mine = await appleResult();
  const own = mine.page.text();
  assert.match(own, new RegExp(head(en.builtOne).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.doesNotMatch(own, OWN_WORDS);
  // Ana's link, opened on the device where the reader chose Apple last week.
  const ana = await appleResult();
  const t = tab(mine.dev, '/consortium/' + hashOf(ana.t));
  const page = await t.load();
  const text = page.text();
  assert.match(text, /Built around the main crop/);
  assert.doesNotMatch(text, OWN_WORDS);
  await page.act('details', apple.id);
  const details = page.text('#ct-dialog');
  assert.match(details, new RegExp(head(en.mainCropText).slice(0, 20)));
  assert.doesNotMatch(details, OWN_WORDS);
  assert.equal(mine.dev.store.has('canopi-own'), false, 'no device-wide memory of own picks');
  assert.equal(JSON.stringify(t.entry().state ?? {}).includes('canopiOwn'), false, 'nor a copy in the tab');
});

// ---------- B3: Add anyway asks first for a plant with a warning ----------
test('B3: Add anyway on a flagged plant asks first; Cancel returns to its button; Yes adds it labelled with its list', async () => {
  const { t, page } = await appleResult();
  const st = stateOf(t).state;
  const hit = otherPlant(membersOn(page), st.site, true);
  assert.ok(hit, 'the fixture has a flagged plant in another list');
  await page.act('open-add');
  await page.type('#ct-add-q', hit.taxon.canonical_name);
  const v = `${hit.climate}:${hit.taxon.id}`;
  await page.act('add-anyway', v);
  assert.ok(page.$('[data-act="add-anyway-yes"]'), 'the confirm is shown');
  assert.equal(page.focused().attribs['data-act'], 'add-anyway-yes', 'and takes the focus');
  assert.ok(!membersOn(page).includes(hit.taxon.id), 'nothing is added before Yes');
  await page.act('confirm-no');
  assert.equal(page.focused().attribs['data-v'], v, 'Cancel returns to the Add anyway button');
  await page.act('add-anyway', v);
  await page.act('add-anyway-yes', v);
  assert.ok(membersOn(page).includes(hit.taxon.id), 'Yes adds it');
  assert.match(page.text(`.plant[data-id="${hit.taxon.id}"]`), new RegExp(head(en.fromList)));
  assert.equal(stateOf(t).state.guests.some((g) => g.id === hit.taxon.id && g.climate === hit.climate), true, 'the link carries it with its list');
  await page.act('details', hit.taxon.id);
  assert.doesNotMatch(page.text('#ct-dialog'), OWN_WORDS);
  // A plant with no warning joins at once.
  const calm = otherPlant(membersOn(page), st.site, false);
  if (calm) {
    await page.escape();
    await page.act('open-add');
    await page.type('#ct-add-q', calm.taxon.canonical_name);
    await page.act('add-anyway', `${calm.climate}:${calm.taxon.id}`);
    assert.ok(membersOn(page).includes(calm.taxon.id));
  }
});

// ---------- B2, F5: a list that fails offers Retry, and Retry keeps the focus ----------
test('B2, F5: in the crop step a failed other list offers Retry outside the live status, and Retry keeps the focus on the page', async () => {
  const dev = device();
  dev.failing.add('tropical.json'); dev.failing.add('mediterranean.json');
  const t = tab(dev, '/consortium/', { siteClimate: 'temperate' });
  const page = await t.load();
  await page.type('#ct-crop-q', 'zzzz');
  const retry = page.$('[data-act="others-retry"]');
  assert.ok(retry, 'Retry is offered');
  assert.equal(!!retry.closest('[role="status"]'), false, 'no control inside a live region');
  assert.match(page.text(), new RegExp(en.othersFailed.slice(0, 12)));
  const before = dev.fetched.filter((f) => f === 'tropical.json').length;
  await page.act('others-retry');
  assert.equal(page.focused() === page.document.body, false, 'the focus stays on the page');
  assert.ok(['others-retry', 'crop-q'].includes(page.focused().attribs['data-fk']), 'on Retry again, or on the search');
  assert.equal(dev.fetched.filter((f) => f === 'tropical.json').length, before + 1, 'Retry fetches again, once');
  dev.failing.clear();
  await page.act('others-retry');
  assert.equal(!!page.$('[data-act="others-retry"]'), false, 'loaded: no Retry left');
  assert.equal(page.focused() === page.document.body, false);
});

test('B2: a link whose guest\'s list fails opens the error with Retry and keeps the link whole; Retry then opens it', async () => {
  const { t: made, page: madePage } = await appleResult();
  const hit = otherPlant(membersOn(madePage), stateOf(made).state.site, false) ?? otherPlant(membersOn(madePage), stateOf(made).state.site, true);
  await madePage.act('open-add');
  await madePage.type('#ct-add-q', hit.taxon.canonical_name);
  const v = `${hit.climate}:${hit.taxon.id}`;
  await madePage.act('add-anyway', v);
  if (madePage.$('[data-act="add-anyway-yes"]')) await madePage.act('add-anyway-yes', v);
  const link = hashOf(made);
  const dev = device();
  dev.failing.add(`${hit.climate}.json`);
  const t = tab(dev, '/consortium/' + link);
  const page = await t.load();
  assert.ok(page.$('[data-act="retry"]'), 'the error screen offers Retry');
  assert.equal(page.focused().attribs['data-act'], 'retry');
  assert.equal(hashOf(t), link, 'the link stays whole in the address bar');
  assert.doesNotMatch(page.text(), /no longer/i);
  dev.failing.clear();
  await page.act('retry');
  assert.ok(membersOn(page).includes(hit.taxon.id), 'the guest is there');
  assert.equal(hashOf(t), link, 'and the address is the same link');
});

// ---------- C8, F7: the address bar's fragment ----------
test('C8: an anchor is written back; another tool state typed or pasted reloads the page', async () => {
  const { t, page } = await appleResult();
  const link = hashOf(t);
  await t.goHash('#main');
  assert.equal(page.reloads, 0);
  assert.equal(hashOf(t), link, 'the consortium\'s fragment comes back');
  await t.goHash('#v=3&c=mediterranean&e=1');
  assert.equal(page.reloads, 1, 'another state reloads to read it');
});

test('F7: after Start over, pasting back the link that was open reloads it', async () => {
  const { t, page } = await appleResult();
  const link = hashOf(t);
  await page.act('start-over');
  assert.equal(hashOf(t), '', 'Start over clears the fragment');
  await t.goHash(link);
  assert.equal(page.reloads, 1, 'the same link pasted again opens it');
});

// ---------- B5, F2: Back and Undo never bring back an earlier country ----------
test('B5: Back to your consortium and Start over\'s Undo keep the country chosen since', async () => {
  const { t, page } = await appleResult();
  await chooseCountry(page, 'DE');
  await page.act('change-crops');
  await chooseCountry(page, 'BR');
  await page.act('crops-back');
  assert.equal(stateOf(t).state.country, 'BR');
  assert.ok(membersOn(page).includes(apple.id), 'the consortium is back');
  await page.act('start-over');
  await chooseCountry(page, 'IT');
  await page.act('undo', 'start');
  assert.ok(membersOn(page).includes(apple.id), 'Undo brings the consortium back');
  assert.equal(stateOf(t).state.country, 'IT', 'with the country chosen since');
});

test('F2: Back to an older entry of this tab keeps the reader\'s country and never calls it the shared link\'s', async () => {
  const dev = device();
  dev.store.set('canopi-country', 'FR'); // chosen on an earlier visit
  const { t, page } = await appleResult(dev);
  assert.equal(stateOf(t).state.country, 'FR');
  await t.goHash('#main');
  await chooseCountry(page, 'BR');
  await t.back();
  assert.equal(page.reloads, 1, 'Back to the older consortium state reloads it');
  const again = await t.load();
  assert.doesNotMatch(again.text(), new RegExp(en.countryLinked), 'never "from the shared link"');
  assert.equal(stateOf(t).state.country, 'BR', 'the reader\'s latest choice stays');
});

test('G1: Back to an older entry where this tab chose another country keeps the newest choice', async () => {
  const { t, page } = await appleResult();
  await chooseCountry(page, 'FR'); // entry 1 holds France in the tab
  await t.goHash('#main');
  await chooseCountry(page, 'BR'); // entry 2 and the device hold Brazil
  await t.back();
  const again = await t.load();
  assert.equal(stateOf(t).state.country, 'BR', 'the newest choice wins');
  assert.doesNotMatch(again.text(), new RegExp(en.countryLinked));
});

test('G1: with storage blocked the tab still keeps the reader\'s choice through a reload', async () => {
  const { t, page } = await appleResult(device({ blocked: true }));
  await chooseCountry(page, 'FR');
  await t.load();
  assert.equal(stateOf(t).state.country, 'FR');
});

test('F2: a real link\'s country reads "from the shared link", also after a reload', async () => {
  const ana = await appleResult();
  await chooseCountry(ana.page, 'BR');
  const dev = device();
  dev.store.set('canopi-country', 'FR');
  const t = tab(dev, '/consortium/' + hashOf(ana.t));
  const page = await t.load();
  assert.match(page.text(), new RegExp(en.countryLinked));
  const again = await t.load();
  assert.match(again.text(), new RegExp(en.countryLinked), 'a reload keeps the sender\'s label');
  assert.equal(stateOf(t).state.country, 'BR');
});

// ---------- F3, F9: whole and cut links ----------
test('F3: a v3 link from before the fragment stays whole after it moves there, through a reload', async () => {
  const t = tab(device(), '/consortium/?v=3&c=temperate');
  const page = await t.load();
  assert.equal(t.entry().url.search, '');
  assert.ok(page.$('#ct-crop-q'), 'it asks the crop question');
  const again = await t.load();
  assert.ok(again.$('#ct-crop-q'), 'a reload asks it again');
  assert.doesNotMatch(again.text(), new RegExp(en['cutLink.title'].slice(0, 20)));
});

test('F9: a cut link for a climate not covered yet stays cut in the address bar and says so', async () => {
  const q = core.encodeState({ climate: 'arid', site: { ...core.DEFAULT_SITE }, kept: [], removed: [], members: [apple.id, temperate.taxa[1].id], plants: [], crops: [], guests: [] });
  q.delete('e');
  const t = tab(device(), '/consortium/#' + q);
  const page = await t.load();
  assert.match(page.text(), new RegExp(head(en['nc.title']).slice(0, 10)));
  assert.doesNotMatch(hashOf(t), /(^|[#&])e=1/, 'no end marker written on a cut link');
  assert.match(page.text(), new RegExp(en['cutLink.title'].slice(0, 20)), 'the cut is said');
  const again = await t.load();
  assert.match(again.text(), new RegExp(en['cutLink.title'].slice(0, 20)), 'and still after a reload');
});

test('G2: once a cut link has opened, leaving for a climate not covered no longer says the link was cut', async () => {
  const q = core.encodeState({ climate: 'temperate', site: { ...core.DEFAULT_SITE }, kept: [], removed: [], members: [apple.id, temperate.taxa[1].id], plants: [], crops: [], guests: [] });
  q.delete('e');
  const t = tab(device(), '/consortium/#' + q);
  const page = await t.load();
  assert.match(page.text(), new RegExp(en['cutLink.title'].slice(0, 20)), 'the cut link says so');
  await page.act('open-place', 'climate');
  await page.act('climate', 'arid');
  assert.match(page.text(), new RegExp(head(en['nc.title']).slice(0, 10)));
  assert.doesNotMatch(page.text(), new RegExp(en['cutLink.title'].slice(0, 20)), 'the reader\'s own consortium is not the cut link');
});

// G5: a closed page's code does nothing.
test('G5: once a page is closed, its timers and data loads do nothing', async () => {
  const t = tab(device(), '/consortium/', { siteClimate: 'temperate' });
  const old = await t.load();
  const { fetch: oldFetch } = old.globals;
  const loading = oldFetch('/data/consortium/temperate.json');
  const fresh = await t.load();
  assert.equal(old.closed, true);
  let ran = false;
  assert.equal(old.later(() => { ran = true; }), undefined, 'no timer is scheduled');
  assert.equal(old.timers.size, 0);
  const tick = Symbol('tick');
  const late = await Promise.race([loading, new Promise((r) => setImmediate(() => setImmediate(() => r(tick))))]);
  assert.equal(late, tick, 'a load started before the close never arrives');
  const after = await Promise.race([oldFetch('/data/consortium/temperate.json'), new Promise((r) => setImmediate(() => setImmediate(() => r(tick))))]);
  assert.equal(after, tick, 'nor does one started after it');
  await fresh.settle();
  assert.equal(ran, false);
});

// F6: the room hint says the number counts plants.
test('F6: the room hint counts plants', async () => {
  const { page } = await appleResult();
  assert.match(page.text(), /suggests 9 plants/);
});

