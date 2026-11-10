// The "Suggest a correction" handler (POST /api/correction), kept free of Astro and Cloudflare
// imports so node --test can run it (scripts/correction.test.mjs). src/pages/api/correction.ts passes
// the request and the Worker's env, as contact does.
//
// The consortium tool's details sheet (src/scripts/consortium/correction.js) posts one reader's
// suggested change to one plant value as JSON. It goes out through the same send_email binding EMAIL
// to MAIL_TO as the contact form, and nothing is stored here. The mail body holds the report twice:
// lines a person reads, then one JSON block between REPORT_START and REPORT_END that canopi-data
// imports as a candidate (docs/data-improvement-plan.md, Step 8). The block never holds personal
// data: the reporter's optional email is only the reply-to address, and no IP or name is read.
// Answers JSON { ok, code, fields? }; logs carry codes only, never report content.
import { CONTROL, EMAIL_RE, FROM, LOCALES, PERMANENT, TIMEOUT_MS, withTimeout } from './contact.mjs';

export { LOCALES };
export const MAX_BODY = 16 * 1024;
// current_value is measured as its JSON text.
export const LIMITS = { plant_name: 200, current_value: 500, current_display: 500, proposed_value: 500, note: 2000, email: 254 };
export const REPORT_SCHEMA = 'canopi-correction-report/1';
export const REPORT_START = '-----BEGIN CANOPI CORRECTION REPORT-----';
export const REPORT_END = '-----END CANOPI CORRECTION REPORT-----';
// What the reader agreed to; the form's consent line says the same.
export const LICENCE = 'CC BY-SA 4.0';
// The climates of the site (src/data/climates.ts), written in the block as the export names them.
export const CLIMATES = ['Tropical', 'Subtropical', 'Mediterranean', 'Arid', 'Temperate', 'Continental', 'Boreal'];
const PLANT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const RELEASE_ID = /^r-[0-9a-f]{16}$/;
// A field id: a catalog field name of the consortium export (a trait or warning key such as height_m
// or sun, stratum, phases, functions, a layer field) or names.<locale>.
const FIELD = /^(?:[a-z][a-z0-9_]{0,63}|names\.[a-z]{2})$/;

const singleLine = (value) => value.replace(CONTROL, '').replace(/[\t\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
const multiLine = (value) => value.replace(/\r\n?/g, '\n').replace(CONTROL, '').trim();

// Returns { report, email, errors }: the report as the block writes it (received_at added by the
// handler), the reply address apart from it, and a code per invalid field.
export function normalise(body) {
  const errors = {};
  const text = (key, clean) => {
    const value = body[key];
    if (value === undefined || value === null) return '';
    if (typeof value !== 'string') { errors[key] = 'type'; return ''; }
    return clean(value);
  };
  const plant_id = text('plant_id', singleLine);
  const plant_name = text('plant_name', singleLine);
  const field = text('field', singleLine);
  // The raw catalog value, any JSON type, as the installed export holds it; null when it has none.
  const current_value = body.current_value === undefined ? null : body.current_value;
  if (JSON.stringify(current_value).length > LIMITS.current_value) errors.current_value = 'too_long';
  const current_display = text('current_display', singleLine);
  const proposed_value = text('proposed_value', singleLine);
  const note = text('note', multiLine);
  const release_id = text('release_id', singleLine);
  const climateIn = text('climate', singleLine).toLowerCase();
  const locale = text('locale', singleLine);
  const email = text('email', singleLine);
  const climate = CLIMATES.find((c) => c.toLowerCase() === climateIn) ?? null;

  const set = (key, code) => { if (!errors[key]) errors[key] = code; };
  if (!PLANT_ID.test(plant_id)) set('plant_id', 'pattern');
  if (!plant_name) set('plant_name', 'required');
  if (!FIELD.test(field)) set('field', 'pattern');
  if (!proposed_value) set('proposed_value', 'required');
  for (const [key, value] of Object.entries({ plant_name, current_display, proposed_value, note, email })) if (value.length > LIMITS[key]) errors[key] = 'too_long';
  if (!errors.proposed_value && proposed_value === current_display) errors.proposed_value = 'unchanged';
  if (!RELEASE_ID.test(release_id)) set('release_id', 'pattern');
  if (!climate) set('climate', 'unknown');
  if (!LOCALES.includes(locale)) set('locale', 'unknown');
  if (body.consent !== true) errors.consent = 'required';
  if (email && !errors.email && !EMAIL_RE.test(email)) errors.email = 'pattern';

  const report = {
    schema: REPORT_SCHEMA, received_at: null, release_id, plant_id, plant_name, field,
    current_value, current_display: current_display || null, proposed_value, note: note || null, climate, locale, licence: LICENCE,
  };
  return { report, email: email || null, errors };
}

// The block canopi-data imports: its markers on their own lines, the report as indented JSON in
// between. JSON writes every newline of a value as \n, so inside the block every line the reporter's
// text reaches starts with spaces and a quote. The readable part above it must keep the same promise
// (mailText): no reporter text may start a line, or it could forge a whole block before the real one.
export const reportBlock = (report) => `${REPORT_START}\n${JSON.stringify(report, null, 2)}\n${REPORT_END}`;

// The readable part. Every value but the note is one line after its label (normalise makes them
// single-line, JSON.stringify writes the catalog value on one line); the note keeps its lines, each
// quoted behind "  | ", so no line of the mail starts with text the reporter wrote.
export function mailText(report, hasEmail) {
  const note = report.note === null ? ['Note: (none)'] : ['Note:', ...report.note.split('\n').map((line) => `  | ${line}`)];
  return [
    `Plant: ${report.plant_name}`,
    `Field: ${report.field}`,
    `Shown now: ${report.current_display ?? '(unknown)'}`,
    `Catalog value: ${JSON.stringify(report.current_value)}`,
    `Proposed: ${report.proposed_value}`,
    ...note,
    '',
    `Release: ${report.release_id}`,
    `Climate: ${report.climate}`,
    `Page language: ${report.locale}`,
    `Licence: the reporter agreed to publish it under ${report.licence}.`,
    hasEmail ? 'Reply to this email to answer the reporter.' : 'The reporter left no email.',
    '',
    'The block below holds no personal data; canopi-data imports it as a candidate.',
    '',
    reportBlock(report),
    '',
  ].join('\n');
}

export async function handleCorrection(request, env, { timeoutMs = TIMEOUT_MS, log = console, now = () => new Date() } = {}) {
  const answer = (status, body) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
  const fail = (status, code, extra = {}) => {
    log.warn?.(`correction: ${code}`);
    return answer(status, { ok: false, code, ...extra });
  };

  if (request.method !== 'POST') return fail(405, 'method_not_allowed');
  // A foreign page may not post here; browsers that send no Origin (or "null") are tolerated.
  const origin = request.headers.get('Origin');
  if (origin && origin !== 'null' && origin !== new URL(request.url).origin) return fail(403, 'forbidden');
  if (Number(request.headers.get('Content-Length')) > MAX_BODY) return fail(413, 'too_large');
  // Only the tool's own script posts here, always as JSON (a cross-site JSON post needs a preflight).
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) return fail(415, 'unsupported_type');

  let body;
  try {
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > MAX_BODY) return fail(413, 'too_large');
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return fail(400, 'bad_request');
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return fail(400, 'bad_request');

  // Bots fill every field; people never see this one. Answer as if sent.
  if (typeof body.website === 'string' && body.website.trim()) {
    log.warn?.('correction: honeypot');
    return answer(200, { ok: true, code: 'sent' });
  }

  const { report, email, errors } = normalise(body);
  if (Object.keys(errors).length) return fail(400, 'invalid', { fields: errors });
  report.received_at = now().toISOString();

  if (!env?.EMAIL) return fail(503, 'unavailable');
  try {
    const to = typeof env.MAIL_TO === 'string' && env.MAIL_TO ? { to: env.MAIL_TO } : {};
    const result = await withTimeout(env.EMAIL.send({
      from: FROM,
      ...to,
      ...(email ? { replyTo: email } : {}),
      subject: `[Canopi correction] ${report.plant_name} · ${report.field}`,
      text: mailText(report, !!email),
    }), timeoutMs);
    if (typeof result?.messageId !== 'string' || !result.messageId) return fail(502, 'failed');
    return answer(200, { ok: true, code: 'sent' });
  } catch (error) {
    const code = typeof error?.code === 'string' ? error.code : 'E_UNKNOWN';
    log.error?.(`correction: send failed ${code}`);
    return fail(502, PERMANENT.has(code) ? 'refused' : 'failed');
  }
}
