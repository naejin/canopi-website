// "Suggest a correction" in the details sheet (app.js detailsParts): the last section of the sheet,
// a button that opens a short form, prefilled with the plant, the facts the sheet shows (one picked),
// the value shown now, the data release, the climate and the page language. It posts JSON to
// /api/correction (src/lib/correction.mjs), which mails the owner; nothing is kept on the server.
// The sheet is redrawn from state on every render, so the form's values live in a state object
// (freshCorrection) that app.js keeps per plant and updates on each input; this module only reads
// it. Words come from correction.* (every key asked for literally, in the 11 locale files).

export const ENDPOINT = '/api/correction';
// The server's limits (src/lib/correction.mjs LIMITS), as maxlength.
export const MAX = { proposed: 500, note: 2000, email: 254 };
const EMAIL = /^[^\s@<>"(),;:]+@[^\s@<>"(),;:]+\.[^\s@<>"(),;:]{2,}$/;
// The server's field codes, by the form's own field names.
const FROM_SERVER = { field: 'field', proposed_value: 'proposed', note: 'note', email: 'email', consent: 'consent' };

// status: 'idle' | 'sending' | 'sent' | 'failed'; message: the key of the line under the button.
export const freshCorrection = (id, open = false) => ({ id, open, field: '', proposed: '', note: '', email: '', consent: false, website: '', status: 'idle', message: null, errors: {} });

// The licence name kept on one line (a phone would break it after "BY-").
const licenceNoBreak = (html) => html.replace('CC BY-SA 4.0', '<span class="corr-licence">CC BY-SA 4.0</span>');
const escHTML = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// A fact as the sheet writes it (escaped HTML with spans) back to the text a reader sees.
export const plain = (html) => String(html ?? '').replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#39);/g, (_, n) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[n]).replace(/\s+/g, ' ').trim();

// The options of "What looks wrong", each a catalog field of the consortium export, so canopi-data
// reads a report without a mapping: the sheet's facts ({ field, label, current, raw }: field a trait
// key such as height_m or sun, current the text the sheet shows ('' when unknown), raw the installed
// value), then the layer (stratum), the succession timing (phases) and the name (names.<locale>).
const NONE = { current: '', raw: null };
export function correctionFields(T, facts, { layer = NONE, timing = NONE, name = { field: 'names.en', ...NONE } } = {}) {
  return [
    ...facts,
    { field: 'stratum', label: T('correction.fieldLayer'), current: layer.current, raw: layer.raw },
    { field: 'phases', label: T('correction.fieldTiming'), current: timing.current, raw: timing.raw },
    { field: name.field, label: T('correction.fieldName'), current: name.current, raw: name.raw },
  ];
}

const fieldOf = (fields, id) => fields.find((f) => f.field === id) ?? null;
export const currentOf = (fields, id) => fieldOf(fields, id)?.current ?? '';
const rawOf = (fields, id) => fieldOf(fields, id)?.raw ?? null;

// What "Value shown now" says for a field: the value, "Unknown", or a dash before one is chosen.
export const currentHTML = (T, fields, id) => {
  if (!fieldOf(fields, id)) return '–';
  const current = currentOf(fields, id);
  return current ? escHTML(current) : `<span class="unknown">${escHTML(T('correction.unknown'))}</span>`;
};

// The line under the button, and what the live line says: sending, sent, or the last message.
export const statusLine = (T, c) => (c.status === 'sending' ? T('correction.sending') : c.status === 'sent' ? T('correction.sent') : c.message ? T(c.message) : '');

// The fields the reader must fix, in the form's order: { name: errorKey }.
export function checkCorrection(c, fields) {
  const errors = {};
  if (!fieldOf(fields, c.field)) errors.field = 'correction.fieldError';
  const proposed = c.proposed.trim();
  if (!proposed) errors.proposed = 'correction.proposedError';
  else if (proposed.length > MAX.proposed) errors.proposed = 'correction.tooLong';
  else if (fieldOf(fields, c.field) && proposed.replace(/\s+/g, ' ') === currentOf(fields, c.field)) errors.proposed = 'correction.unchanged';
  if (c.note.trim().length > MAX.note) errors.note = 'correction.tooLong';
  if (c.email.trim() && !EMAIL.test(c.email.trim())) errors.email = 'correction.emailError';
  if (c.consent !== true) errors.consent = 'correction.consentError';
  return errors;
}
export const ERROR_ORDER = ['field', 'proposed', 'note', 'email', 'consent'];

// The JSON the endpoint reads. ctx: { plantId, plantName, release, climate, locale }. current_value is
// the installed catalog value (any JSON type), current_display the text the sheet showed for it.
export function correctionBody(c, fields, ctx) {
  return {
    plant_id: ctx.plantId, plant_name: ctx.plantName, field: c.field, current_value: rawOf(fields, c.field), current_display: currentOf(fields, c.field),
    proposed_value: c.proposed.trim(), note: c.note.trim(), release_id: ctx.release, climate: ctx.climate, locale: ctx.locale,
    consent: c.consent === true, email: c.email.trim(), website: c.website,
  };
}

// Posts a report; answers { status: 'sent' } or { status: 'failed', message, errors }. Never throws.
export async function postCorrection(fetchImpl, body) {
  try {
    const response = await fetchImpl(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => ({}));
    if (response.ok && result?.ok) return { status: 'sent', message: null, errors: {} };
    if (result?.code === 'invalid' && result.fields) {
      const errors = {};
      for (const [key, code] of Object.entries(result.fields)) {
        const own = FROM_SERVER[key];
        if (own) errors[own] = own === 'consent' ? 'correction.consentError' : own === 'email' ? 'correction.emailError' : own === 'field' ? 'correction.fieldError' : code === 'unchanged' ? 'correction.unchanged' : code === 'too_long' ? 'correction.tooLong' : 'correction.proposedError';
      }
      // A field the reader cannot change (the plant, the release, the language) was refused: the page's fault.
      if (Object.keys(errors).length && Object.keys(result.fields).every((k) => FROM_SERVER[k])) return { status: 'failed', message: 'correction.invalid', errors };
    }
    return { status: 'failed', message: result?.code === 'refused' ? 'correction.refused' : 'correction.failed', errors: {} };
  } catch {
    return { status: 'failed', message: 'correction.failed', errors: {} };
  }
}

// The section's markup. ctx: { release, plantLabel, climateLabel, languageName }; fk(key) writes the
// data-fk attribute app.js puts the focus back with. With no release id there is nothing to send:
// the section is left out.
export function correctionHTML(T, c, fields, ctx, fk) {
  if (!ctx.release) return '';
  const esc = escHTML;
  const head = `<h3 id="ct-corr-title">${esc(T('correction.title'))}</h3>`;
  if (!c.open) {
    return `<section class="d-section d-correct" aria-labelledby="ct-corr-title">${head}<p class="seg-hint">${esc(T('correction.lede'))}</p>
      <div><button class="button button-secondary button-small" type="button" data-act="corr-open" aria-expanded="false" aria-controls="ct-corr" ${fk('corr-open')}>${esc(T('correction.open'))}</button></div></section>`;
  }
  if (c.status === 'sent') {
    return `<section class="d-section d-correct" aria-labelledby="ct-corr-title">${head}<div class="corr-sent" id="ct-corr"><p tabindex="-1" ${fk('corr-sent')}>${esc(T('correction.sent'))}</p>
      <div><button class="button button-secondary button-small" type="button" data-act="corr-again" ${fk('corr-again')}>${esc(T('correction.another'))}</button></div></div></section>`;
  }
  const err = (name) => c.errors[name];
  const invalid = (name, describedBy = '') => {
    const ids = [describedBy, err(name) ? `ct-corr-${name}-error` : ''].filter(Boolean).join(' ');
    return `aria-invalid="${!!err(name)}"${ids ? ` aria-describedby="${ids}"` : ''}`;
  };
  const errorLine = (name) => `<p class="field-error" id="ct-corr-${name}-error"${err(name) ? '' : ' hidden'}>${err(name) ? esc(T(err(name), { max: MAX[name] ?? '' })) : ''}</p>`;
  const sending = c.status === 'sending';
  const line = statusLine(T, c);
  const options = `<option value=""${c.field ? '' : ' selected'}>${esc(T('correction.fieldChoose'))}</option>${fields.map((f) => `<option value="${esc(f.field)}"${f.field === c.field ? ' selected' : ''}>${esc(f.label)}</option>`).join('')}`;
  return `<section class="d-section d-correct" aria-labelledby="ct-corr-title">${head}
    <form id="ct-corr" class="corr-form" novalidate data-corr-form>
      <p class="seg-hint">${esc(T('correction.lede'))}</p>
      <div class="field"><label for="ct-corr-field">${esc(T('correction.field'))}</label>
        <select id="ct-corr-field" data-corr="field" ${invalid('field')} ${fk('corr-field')}>${options}</select>${errorLine('field')}</div>
      <p class="corr-current"><span class="muted">${esc(T('correction.current'))}</span> <output id="ct-corr-current" for="ct-corr-field">${currentHTML(T, fields, c.field)}</output></p>
      <div class="field"><label for="ct-corr-proposed">${esc(T('correction.proposed'))}</label>
        <input id="ct-corr-proposed" type="text" maxlength="${MAX.proposed}" autocomplete="off" data-corr="proposed" value="${esc(c.proposed)}" ${invalid('proposed')} ${fk('corr-proposed')}>${errorLine('proposed')}</div>
      <div class="field"><label for="ct-corr-note">${esc(T('correction.note'))}</label>
        <textarea id="ct-corr-note" rows="3" maxlength="${MAX.note}" data-corr="note" ${invalid('note', 'ct-corr-note-hint')} ${fk('corr-note')}>${esc(c.note)}</textarea>
        <p class="seg-hint" id="ct-corr-note-hint">${esc(T('correction.noteHint'))}</p>${errorLine('note')}</div>
      <div class="field"><label for="ct-corr-email">${esc(T('correction.email'))}</label>
        <input id="ct-corr-email" type="email" maxlength="${MAX.email}" autocomplete="email" inputmode="email" data-corr="email" value="${esc(c.email)}" ${invalid('email', 'ct-corr-privacy')} ${fk('corr-email')}>
        <p class="seg-hint" id="ct-corr-privacy">${esc(T('correction.privacy'))}</p>${errorLine('email')}</div>
      <div class="corr-consent"><label><input id="ct-corr-consent" type="checkbox" data-corr="consent"${c.consent ? ' checked' : ''} ${invalid('consent')} ${fk('corr-consent')}><span>${licenceNoBreak(esc(T('correction.consent')))}</span></label>${errorLine('consent')}</div>
      <p class="corr-context seg-hint">${esc(T('correction.context', { plant: ctx.plantLabel, release: ctx.release, climate: ctx.climateLabel, language: ctx.languageName }))}</p>
      <div class="corr-hp" aria-hidden="true"><label>${esc(T('correction.honeypot'))} <input type="text" data-corr="website" tabindex="-1" autocomplete="off" value="${esc(c.website)}"></label></div>
      <div class="actions corr-actions">
        <button class="button button-primary button-small" type="submit" data-act="corr-send"${sending ? ' aria-disabled="true"' : ''} ${fk('corr-send')}>${esc(T('correction.send'))}</button>
        <button class="button button-secondary button-small" type="button" data-act="corr-cancel" ${fk('corr-cancel')}>${esc(T('correction.cancel'))}</button>
      </div>
      <p class="corr-status${c.status === 'failed' ? ' is-error' : ''}" id="ct-corr-status">${esc(line)}</p>
    </form></section>`;
}
