// The correction endpoint (src/lib/correction.mjs, POST /api/correction): a reader's suggested change
// to one plant value, mailed to the owner as a structured report. Nothing is stored server-side; the
// report's JSON block carries no personal data, so canopi-data can import it as it is.
import assert from 'node:assert/strict';
import test from 'node:test';
import { handleCorrection, reportBlock, MAX_BODY, LIMITS, REPORT_START, REPORT_END, REPORT_SCHEMA } from '../src/lib/correction.mjs';

const URL_ = 'https://projectcanopi.com/api/correction';
const quiet = { warn() {}, error() {} };
const valid = {
  plant_id: '0f1e2d3c-4b5a-4968-8776-655443322110',
  plant_name: 'Malus domestica',
  field: 'height_m',
  current_value: '2–10 m',
  proposed_value: '3–8 m',
  note: 'Standard rootstock;\nsee my orchard',
  release_id: 'r-559dd6ac9aef21e1',
  climate: 'temperate',
  locale: 'fr',
  consent: true,
  email: 'ada@example.org',
  website: '',
};

function post(body = valid, { headers = {}, raw = null } = {}) {
  return new Request(URL_, {
    method: 'POST',
    body: raw ?? JSON.stringify(body),
    headers: { Origin: 'https://projectcanopi.com', 'Content-Type': 'application/json', Accept: 'application/json', ...headers },
  });
}

function fakeEmail(behaviour = () => ({ messageId: 'id-1' })) {
  const sent = [];
  return { sent, EMAIL: { async send(message) { sent.push(message); return behaviour(message); } }, MAIL_TO: 'owner@example.org' };
}

const run = (request, env, options = {}) => handleCorrection(request, env, { log: quiet, now: () => new Date('2026-11-10T12:00:00Z'), ...options });

// The JSON block between its marker lines, parsed: what canopi-data imports.
function block(text) {
  const start = text.indexOf(`${REPORT_START}\n`), end = text.indexOf(`\n${REPORT_END}`);
  assert.ok(start >= 0 && end > start, 'the report block is marked');
  return JSON.parse(text.slice(start + REPORT_START.length + 1, end));
}

test('a valid report is mailed to MAIL_TO with the reporter as reply-to, and answers sent', async () => {
  const env = fakeEmail();
  const response = await run(post(), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), { ok: true, code: 'sent' });
  const [message] = env.sent;
  assert.equal(message.to, 'owner@example.org');
  assert.equal(message.replyTo, 'ada@example.org');
  assert.equal(message.from.email, 'contact@projectcanopi.com');
  assert.equal(message.subject, '[Canopi correction] Malus domestica · height_m');
});

test('the JSON block is the report without personal data: no email, no IP, no name of the reporter', async () => {
  const env = fakeEmail();
  await run(post(valid, { headers: { 'CF-Connecting-IP': '203.0.113.9' } }), env);
  const { text } = env.sent[0];
  assert.deepEqual(block(text), {
    schema: REPORT_SCHEMA,
    received_at: '2026-11-10T12:00:00.000Z',
    release_id: 'r-559dd6ac9aef21e1',
    plant_id: '0f1e2d3c-4b5a-4968-8776-655443322110',
    plant_name: 'Malus domestica',
    field: 'height_m',
    current_value: '2–10 m',
    proposed_value: '3–8 m',
    note: 'Standard rootstock;\nsee my orchard',
    climate: 'Temperate',
    locale: 'fr',
    licence: 'CC BY-SA 4.0',
  });
  // The email is nowhere in the body: it is only the reply-to address.
  assert.doesNotMatch(text, /ada@example\.org/);
  assert.doesNotMatch(text, /203\.0\.113\.9/);
  assert.match(text, /Reply to this email to answer the reporter\./);
  // A person reads the same values above the block.
  assert.match(text, /^Plant: Malus domestica\nField: height_m\nShown now: 2–10 m\nProposed: 3–8 m\n/);
  assert.match(text, /Release: r-559dd6ac9aef21e1\nClimate: Temperate\nPage language: fr\n/);
});

test('with no email there is no reply-to, and the body says so', async () => {
  const env = fakeEmail();
  const response = await run(post({ ...valid, email: '' }), env);
  assert.equal(response.status, 200);
  assert.equal(env.sent[0].replyTo, undefined);
  assert.match(env.sent[0].text, /The reporter left no email\./);
  const { email, ...noEmail } = valid;
  assert.equal((await run(post(noEmail), fakeEmail())).status, 200, 'the email key may be absent');
});

test('an empty note and an unknown current value are null in the block', async () => {
  const env = fakeEmail();
  await run(post({ ...valid, note: '  ', current_value: '' }), env);
  const report = block(env.sent[0].text);
  assert.equal(report.note, null);
  assert.equal(report.current_value, null);
  assert.match(env.sent[0].text, /Shown now: \(unknown\)\n/);
});

test('reportBlock writes one marked block that a free-text field cannot close early', () => {
  const report = { schema: REPORT_SCHEMA, note: `x\n${REPORT_END}\ny` };
  const text = reportBlock(report);
  assert.equal(text.split('\n').filter((line) => line === REPORT_END).length, 1);
  assert.deepEqual(block(text), report);
});

test('consent must be the boolean true', async () => {
  for (const consent of [false, 'true', 1, undefined, null]) {
    const env = fakeEmail();
    const response = await run(post({ ...valid, consent }), env);
    assert.equal(response.status, 400, String(consent));
    assert.deepEqual((await response.json()).fields, { consent: 'required' });
    assert.equal(env.sent.length, 0);
  }
});

test('unknown locales, climates, release ids, plant ids and fields are refused', async () => {
  const cases = [
    [{ locale: 'xx' }, { locale: 'unknown' }],
    [{ locale: undefined }, { locale: 'unknown' }],
    [{ climate: 'lunar' }, { climate: 'unknown' }],
    [{ release_id: 'r-123' }, { release_id: 'pattern' }],
    [{ release_id: '' }, { release_id: 'pattern' }],
    [{ plant_id: 'not-a-uuid' }, { plant_id: 'pattern' }],
    [{ field: 'Height; DROP' }, { field: 'pattern' }],
    [{ email: 'not-an-address' }, { email: 'pattern' }],
  ];
  for (const [change, fields] of cases) {
    const env = fakeEmail();
    const response = await run(post({ ...valid, ...change }), env);
    assert.equal(response.status, 400, JSON.stringify(change));
    assert.deepEqual(await response.json(), { ok: false, code: 'invalid', fields }, JSON.stringify(change));
    assert.equal(env.sent.length, 0);
  }
});

test('missing, unchanged and oversized fields are refused with a code per field', async () => {
  const env = fakeEmail();
  const response = await run(post({
    ...valid,
    plant_name: 'x'.repeat(LIMITS.plant_name + 1),
    current_value: 'y'.repeat(LIMITS.current_value + 1),
    proposed_value: '   ',
    note: 'z'.repeat(LIMITS.note + 1),
  }), env);
  assert.equal(response.status, 400);
  assert.deepEqual((await response.json()).fields, { plant_name: 'too_long', current_value: 'too_long', proposed_value: 'required', note: 'too_long' });
  const same = await run(post({ ...valid, proposed_value: ' 2–10 m ' }), env);
  assert.deepEqual((await same.json()).fields, { proposed_value: 'unchanged' });
  const long = await run(post({ ...valid, proposed_value: 'p'.repeat(LIMITS.proposed_value + 1) }), env);
  assert.deepEqual((await long.json()).fields, { proposed_value: 'too_long' });
  assert.equal(env.sent.length, 0);
});

test('values that are not strings are refused, never coerced', async () => {
  const env = fakeEmail();
  const response = await run(post({ ...valid, proposed_value: ['a'], note: { x: 1 } }), env);
  assert.equal(response.status, 400);
  assert.deepEqual((await response.json()).fields, { proposed_value: 'type', note: 'type' });
});

test('control characters are stripped and single-line fields stay on one line', async () => {
  const env = fakeEmail();
  await run(post({ ...valid, plant_name: ' Malus\r\ndomestica\u0007 ', proposed_value: '3 –8 m', note: 'a\u0000b\r\nc' }), env);
  const report = block(env.sent[0].text);
  assert.equal(report.plant_name, 'Malus domestica');
  assert.equal(report.proposed_value, '3–8 m');
  assert.equal(report.note, 'ab\nc');
  assert.equal(env.sent[0].subject, '[Canopi correction] Malus domestica · height_m');
});

test('a filled honeypot answers success and sends nothing', async () => {
  const env = fakeEmail();
  const response = await run(post({ ...valid, website: 'https://spam.example' }), env);
  assert.deepEqual(await response.json(), { ok: true, code: 'sent' });
  assert.equal(env.sent.length, 0);
});

test('a foreign origin is refused; a missing or null origin is tolerated', async () => {
  const env = fakeEmail();
  assert.equal((await run(post(valid, { headers: { Origin: 'https://evil.example' } }), env)).status, 403);
  assert.equal((await run(post(valid, { headers: { Origin: 'null' } }), env)).status, 200);
  const request = post();
  request.headers.delete('Origin');
  assert.equal((await run(request, env)).status, 200);
  assert.equal(env.sent.length, 2);
});

test('only a JSON body is read: another type, bad JSON or a non-object answers 4xx', async () => {
  const env = fakeEmail();
  assert.equal((await run(post(valid, { headers: { 'Content-Type': 'text/plain' } }), env)).status, 415);
  assert.equal((await run(post(valid, { raw: '{"plant_id":' }), env)).status, 400);
  assert.equal((await run(post(valid, { raw: '[1,2]' }), env)).status, 400);
  assert.equal((await run(post(valid, { raw: 'null' }), env)).status, 400);
  assert.equal(env.sent.length, 0);
});

test('bodies over the limit are refused before parsing', async () => {
  const env = fakeEmail();
  const declared = await run(post(valid, { headers: { 'Content-Length': String(MAX_BODY + 1) } }), env);
  assert.equal(declared.status, 413);
  const actual = await run(post({ ...valid, note: 'x'.repeat(MAX_BODY) }), env);
  assert.equal(actual.status, 413);
  assert.equal(env.sent.length, 0);
});

test('only POST is accepted', async () => {
  assert.equal((await run(new Request(URL_, { headers: { Accept: 'application/json' } }), fakeEmail())).status, 405);
});

test('send failures map to refused, failed or unavailable; a hang times out as failed', async () => {
  const cases = [
    [() => { throw Object.assign(new Error('x'), { code: 'E_HEADER_VALUE_INVALID' }); }, 502, 'refused'],
    [() => { throw Object.assign(new Error('x'), { code: 'E_RATE_LIMIT_EXCEEDED' }); }, 502, 'failed'],
    [() => { throw new Error('no code'); }, 502, 'failed'],
    [() => ({}), 502, 'failed'],
  ];
  for (const [behaviour, status, code] of cases) {
    const response = await run(post(), fakeEmail(behaviour));
    assert.equal(response.status, status);
    assert.equal((await response.json()).code, code);
  }
  const missing = await run(post(), {});
  assert.equal(missing.status, 503);
  assert.equal((await missing.json()).code, 'unavailable');
  const hung = await run(post(), fakeEmail(() => new Promise(() => {})), { timeoutMs: 20 });
  assert.equal((await hung.json()).code, 'failed');
});

test('logs never carry report content or the email', async () => {
  const lines = [];
  const log = { warn: (line) => lines.push(line), error: (line) => lines.push(line) };
  await handleCorrection(post({ ...valid, consent: false }), fakeEmail(), { log });
  await handleCorrection(post(), fakeEmail(() => { throw Object.assign(new Error('Malus secret'), { code: 'E_X' }); }), { log });
  assert.ok(lines.length >= 2);
  for (const line of lines) assert.doesNotMatch(line, /Malus|ada@|orchard|secret|3–8/);
});

test('the Worker route passes the request and env to the handler, as contact does', async () => {
  const { readFileSync } = await import('node:fs');
  const route = readFileSync(new URL('../src/pages/api/correction.ts', import.meta.url), 'utf8');
  assert.match(route, /export const prerender = false;/);
  assert.match(route, /export const POST: APIRoute = \(\{ request \}\) => handleCorrection\(request, env\);/);
  assert.match(route, /from 'cloudflare:workers'/);
});
