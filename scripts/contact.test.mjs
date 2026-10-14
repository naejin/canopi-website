import assert from 'node:assert/strict';
import test from 'node:test';
import { handleContact, MAX_BODY } from '../src/lib/contact.mjs';

const URL_ = 'https://projectcanopi.com/api/contact';
const quiet = { warn() {}, error() {} };
const valid = { lang: 'fr', name: 'Ada', email: 'ada@example.org', message: 'Hello\r\nthere', website: '' };

function post(fields = valid, { headers = {}, json = true } = {}) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.append(key, value);
  return new Request(URL_, {
    method: 'POST',
    body,
    headers: { Origin: 'https://projectcanopi.com', ...(json ? { Accept: 'application/json' } : {}), ...headers },
  });
}

function fakeEmail(behaviour = () => ({ messageId: 'id-1' })) {
  const sent = [];
  return { sent, EMAIL: { async send(message) { sent.push(message); return behaviour(message); } }, MAIL_TO: 'owner@example.org' };
}

const run = (request, env, options = {}) => handleContact(request, env, { log: quiet, ...options });

test('a valid message is sent to MAIL_TO with the visitor as reply-to', async () => {
  const env = fakeEmail();
  const response = await run(post(), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.deepEqual(await response.json(), { ok: true, code: 'sent' });
  const [message] = env.sent;
  assert.equal(message.to, 'owner@example.org');
  assert.equal(message.replyTo, 'ada@example.org');
  assert.equal(message.from.email, 'contact@projectcanopi.com');
  assert.equal(message.subject, '[Canopi] FR · Ada');
  assert.match(message.text, /Name: Ada\nEmail: ada@example.org\nPage language: fr\n\nHello\nthere\n/);
  assert.match(message.text, /Reply to this email to answer the sender\.$/);
});

test('fields are normalised: control characters stripped, name and email on one line', async () => {
  const env = fakeEmail();
  await run(post({ ...valid, name: ' Ada\r\nBcc: x@y.z\u0007 ', message: 'a\u0000b\u2028c' }), env);
  assert.equal(env.sent[0].name, undefined);
  assert.equal(env.sent[0].subject, '[Canopi] FR · Ada Bcc: x@y.z');
  assert.match(env.sent[0].text, /\n\nabc\n/);
});

test('missing, too long and malformed fields answer 400 with a code per field and send nothing', async () => {
  const env = fakeEmail();
  const response = await run(post({ ...valid, name: '  ', email: 'not-an-address', message: 'x'.repeat(5001) }), env);
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { ok: false, code: 'invalid', fields: { name: 'required', email: 'pattern', message: 'too_long' } });
  assert.equal(env.sent.length, 0);
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

test('bodies over 32 KB are refused before parsing', async () => {
  const env = fakeEmail();
  const declared = await run(post(valid, { headers: { 'Content-Length': String(MAX_BODY + 1) } }), env);
  assert.equal(declared.status, 413);
  const actual = await run(post({ ...valid, message: 'x'.repeat(MAX_BODY) }), env);
  assert.equal(actual.status, 413);
  assert.equal(env.sent.length, 0);
});

test('only POST is accepted', async () => {
  assert.equal((await run(new Request(URL_, { headers: { Accept: 'application/json' } }), fakeEmail())).status, 405);
});

test('send failures map to refused, failed or unavailable', async () => {
  const cases = [
    [() => { throw Object.assign(new Error('x'), { code: 'E_HEADER_VALUE_INVALID' }); }, 502, 'refused'],
    [() => { throw Object.assign(new Error('x'), { code: 'E_RATE_LIMIT_EXCEEDED' }); }, 502, 'failed'],
    [() => { throw Object.assign(new Error('x'), { code: 'E_DELIVERY_FAILED' }); }, 502, 'failed'],
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
});

test('a send that hangs times out as failed', async () => {
  const env = fakeEmail(() => new Promise(() => {}));
  const response = await run(post(), env, { timeoutMs: 20 });
  assert.equal(response.status, 502);
  assert.equal((await response.json()).code, 'failed');
});

test('a plain form post is redirected to the sent or failed page of its language', async () => {
  const sent = await run(post(valid, { json: false }), fakeEmail());
  assert.equal(sent.status, 303);
  assert.equal(sent.headers.get('Location'), '/fr/contact/sent/');
  const failed = await run(post({ ...valid, lang: 'en', email: '' }, { json: false }), fakeEmail());
  assert.equal(failed.headers.get('Location'), '/contact/failed/');
  const unknown = await run(post({ ...valid, lang: 'xx' }, { json: false }), fakeEmail());
  assert.equal(unknown.headers.get('Location'), '/contact/sent/');
});

test('logs never carry message content', async () => {
  const lines = [];
  const log = { warn: (line) => lines.push(line), error: (line) => lines.push(line) };
  await handleContact(post({ ...valid, email: 'bad' }), fakeEmail(), { log });
  await handleContact(post(), fakeEmail(() => { throw Object.assign(new Error('Ada secret'), { code: 'E_X' }); }), { log });
  assert.ok(lines.length >= 2);
  for (const line of lines) assert.doesNotMatch(line, /Ada|ada@|Hello|secret/);
});
