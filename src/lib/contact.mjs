// The contact form's handler, kept free of Astro and Cloudflare imports so node --test can run it
// (scripts/contact.test.mjs). src/pages/api/contact.ts passes the request and the Worker's env.
//
// The visitor's message goes out through the send_email binding EMAIL to MAIL_TO; the address
// itself never appears in the page. Answers JSON { ok, code, fields? } to the page script
// (Accept: application/json) and a 303 to /{lang}/contact/sent/ or /failed/ to a plain form post.
// Logs carry codes only, never message content.

export const LOCALES = ['en', 'fr', 'es', 'pt', 'it', 'zh', 'de', 'ja', 'ko', 'nl', 'ru'];
export const FROM = { email: 'contact@projectcanopi.com', name: 'Canopi website' };
export const MAX_BODY = 32 * 1024;
export const LIMITS = { name: 120, email: 254, message: 5000 };
export const TIMEOUT_MS = 10_000;
const EMAIL_RE = /^[^\s@<>"(),;:]+@[^\s@<>"(),;:]+\.[^\s@<>"(),;:]{2,}$/;
// Control characters (C0 except tab and newline, DEL, C1) and Unicode line separators.
const CONTROL = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u2028\u2029]/g;

// send() error codes that will fail again however often the visitor retries (the portfolio
// mailer's 4xx codes, without 408 and 429).
const PERMANENT = new Set([
  'E_VALIDATION_ERROR', 'E_FIELD_MISSING', 'E_TOO_MANY_RECIPIENTS', 'E_TOO_MANY_ATTACHMENTS',
  'E_HEADER_NOT_ALLOWED', 'E_HEADER_USE_API_FIELD', 'E_HEADER_VALUE_INVALID', 'E_HEADER_VALUE_TOO_LONG',
  'E_HEADER_NAME_INVALID', 'E_HEADERS_TOO_LARGE', 'E_HEADERS_TOO_MANY', 'E_CONTENT_TOO_LARGE',
]);

const singleLine = (value) => value.replace(CONTROL, '').replace(/[\t\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

// Returns { fields, errors }: the cleaned values and a code per invalid field.
export function normalise(form) {
  const get = (key) => (typeof form.get(key) === 'string' ? form.get(key) : '');
  const fields = {
    name: singleLine(get('name')),
    email: singleLine(get('email')),
    message: get('message').replace(/\r\n?/g, '\n').replace(CONTROL, '').trim(),
  };
  const errors = {};
  for (const [key, value] of Object.entries(fields)) {
    if (!value) errors[key] = 'required';
    else if (value.length > LIMITS[key]) errors[key] = 'too_long';
  }
  if (!errors.email && !EMAIL_RE.test(fields.email)) errors.email = 'pattern';
  return { fields, errors };
}

export function mailText({ name, email, message }, lang) {
  return [
    `Name: ${name}`,
    `Email: ${email}`,
    `Page language: ${lang}`,
    '',
    message,
    '',
    '--',
    'Reply to this email to answer the sender.',
  ].join('\n');
}

const withTimeout = (promise, ms) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'E_TIMEOUT' })), ms);
  promise.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
});

export async function handleContact(request, env, { timeoutMs = TIMEOUT_MS, log = console } = {}) {
  const wantsJson = (request.headers.get('Accept') || '').includes('application/json');
  let lang = 'en';
  const answer = (status, body) => {
    if (!wantsJson) {
      const prefix = lang === 'en' ? '' : `/${lang}`;
      const location = `${prefix}/contact/${body.ok ? 'sent' : 'failed'}/`;
      return new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });
    }
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  };
  const fail = (status, code, extra = {}) => {
    log.warn?.(`contact: ${code}`);
    return answer(status, { ok: false, code, ...extra });
  };

  if (request.method !== 'POST') return fail(405, 'method_not_allowed');
  // A foreign page may not post here; browsers that send no Origin (or "null") are tolerated.
  const origin = request.headers.get('Origin');
  if (origin && origin !== 'null' && origin !== new URL(request.url).origin) return fail(403, 'forbidden');
  if (Number(request.headers.get('Content-Length')) > MAX_BODY) return fail(413, 'too_large');

  let form;
  try {
    const body = await request.arrayBuffer();
    if (body.byteLength > MAX_BODY) return fail(413, 'too_large');
    form = await new Response(body, { headers: { 'Content-Type': request.headers.get('Content-Type') || '' } }).formData();
  } catch {
    return fail(400, 'bad_request');
  }
  const formLang = form.get('lang');
  if (LOCALES.includes(formLang)) lang = formLang;

  // Bots fill every field; people never see this one. Answer as if sent.
  if (typeof form.get('website') === 'string' && form.get('website').trim()) {
    log.warn?.('contact: honeypot');
    return answer(200, { ok: true, code: 'sent' });
  }

  const { fields, errors } = normalise(form);
  if (Object.keys(errors).length) return fail(400, 'invalid', { fields: errors });

  if (!env?.EMAIL) return fail(503, 'unavailable');
  try {
    const to = typeof env.MAIL_TO === 'string' && env.MAIL_TO ? { to: env.MAIL_TO } : {};
    const result = await withTimeout(env.EMAIL.send({
      from: FROM,
      ...to,
      replyTo: fields.email,
      subject: `[Canopi] ${lang.toUpperCase()} · ${fields.name}`,
      text: mailText(fields, lang),
    }), timeoutMs);
    if (typeof result?.messageId !== 'string' || !result.messageId) return fail(502, 'failed');
    return answer(200, { ok: true, code: 'sent' });
  } catch (error) {
    const code = typeof error?.code === 'string' ? error.code : 'E_UNKNOWN';
    log.error?.(`contact: send failed ${code}`);
    return fail(502, PERMANENT.has(code) ? 'refused' : 'failed');
  }
}
