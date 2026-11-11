/** @jsxImportSource preact */
// "Suggest a correction" in the plant dialog (stream S3; ported from v1 correction.js): a short form,
// prefilled with the plant, the facts the dialog shows (one picked), the value shown now, the data
// release, the climate and the page language. It posts JSON to /api/correction
// (src/lib/correction.mjs, whose contract and tests are unchanged), which mails the owner; nothing is
// kept on the server. Offline (design check §5): "Not sent: you seem offline. Your text is kept." with
// Try again. What the reader writes is kept per plant (Details.tsx `drafts`) until it is sent.
// Words: the correction.* family (S3 block of the locale files), passed by ConsortiumPage.astro.
import { useEffect, useState } from 'preact/hooks';
import { pageLang, T } from '../strings.ts';
import { LIMITS } from '../../../lib/correction.mjs';
import { EMAIL_RE } from '../../../lib/contact.mjs';
import { drafts, type CorrectionDraft, type CorrectionField } from './Details.tsx';

const ENDPOINT = '/api/correction';
// The server's limits, as maxlength.
const MAX = { proposed: LIMITS.proposed_value, note: LIMITS.note, email: LIMITS.email } as const;
// The server's field codes, by the form's own field names.
const FROM_SERVER: Record<string, Name> = { field: 'field', proposed_value: 'proposed', note: 'note', email: 'email', consent: 'consent' };
type Name = 'field' | 'proposed' | 'note' | 'email' | 'consent';
const ORDER: Name[] = ['field', 'proposed', 'note', 'email', 'consent'];

type Form = CorrectionDraft;
type Status = 'idle' | 'sending' | 'sent' | 'failed';
type Errors = Partial<Record<Name, string>>;
interface Props { fields: CorrectionField[]; plantId: string; plantName: string; plantLabel: string; release: string; climate: string; climateLabel: string; onCancel: () => void; focusFirst?: boolean }

const fieldOf = (fields: CorrectionField[], id: string) => fields.find((f) => f.field === id) ?? null;

function checkCorrection(c: Form, fields: CorrectionField[]): Errors {
  const errors: Errors = {};
  const f = fieldOf(fields, c.field);
  if (!f) errors.field = 'correction.fieldError';
  const proposed = c.proposed.trim();
  if (!proposed) errors.proposed = 'correction.proposedError';
  else if (proposed.length > MAX.proposed) errors.proposed = 'correction.tooLong';
  else if (f && proposed.replace(/\s+/g, ' ') === f.current) errors.proposed = 'correction.unchanged';
  if (c.note.trim().length > MAX.note) errors.note = 'correction.tooLong';
  if (c.email.trim() && !EMAIL_RE.test(c.email.trim())) errors.email = 'correction.emailError';
  if (!c.consent) errors.consent = 'correction.consentError';
  return errors;
}

// Posts a report: sent, failed (with the server's field errors) or offline (no answer). Never throws.
async function post(body: unknown): Promise<{ status: 'sent' | 'failed'; message: string | null; errors: Errors }> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
  } catch {
    return { status: 'failed', message: 'correction.offline', errors: {} };
  }
  const result = (await response.json().catch(() => ({}))) as { ok?: boolean; code?: string; fields?: Record<string, string> };
  if (response.ok && result?.ok) return { status: 'sent', message: null, errors: {} };
  if (result?.code === 'invalid' && result.fields) {
    const errors: Errors = {};
    for (const [key, code] of Object.entries(result.fields)) {
      const own = FROM_SERVER[key];
      if (own) errors[own] = own === 'consent' ? 'correction.consentError' : own === 'email' ? 'correction.emailError' : own === 'field' ? 'correction.fieldError' : code === 'unchanged' ? 'correction.unchanged' : code === 'too_long' ? 'correction.tooLong' : 'correction.proposedError';
    }
    if (Object.keys(errors).length && Object.keys(result.fields).every((k) => FROM_SERVER[k])) return { status: 'failed', message: 'correction.invalid', errors };
  }
  return { status: 'failed', message: result?.code === 'refused' ? 'correction.refused' : 'correction.failed', errors: {} };
}

let languageNames: Intl.DisplayNames | null = null;
const languageName = (code: string) => { try { languageNames ??= new Intl.DisplayNames([code], { type: 'language' }); return languageNames.of(code) ?? code; } catch { return code; } };

export default function Correction({ fields, plantId, plantName, plantLabel, release, climate, climateLabel, onCancel, focusFirst = false }: Props) {
  const [form, setFormState] = useState<Form>(() => drafts.get(plantId) ?? { field: '', proposed: '', note: '', email: '', consent: false, website: '' });
  // A draft is unsent text (a field, a value or a note); an email or a tick alone is not one.
  const setForm = (next: (f: Form) => Form) => setFormState((f) => { const n = next(f); if (n.field || n.proposed.trim() || n.note.trim()) drafts.set(plantId, n); else drafts.delete(plantId); return n; });
  // The first field takes the focus when the reader opens the form, not when a draft brings it back.
  useEffect(() => { if (focusFirst) document.getElementById('ct-corr-field')?.focus(); }, []);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));
  const current = fieldOf(fields, form.field);

  async function send(e?: Event) {
    e?.preventDefault();
    if (status === 'sending') return;
    const found = checkCorrection(form, fields);
    setErrors(found);
    if (Object.keys(found).length) {
      setMessage('correction.invalid');
      setStatus('failed');
      const first = ORDER.find((n) => found[n]);
      if (first) document.getElementById(`ct-corr-${first}`)?.focus();
      return;
    }
    setStatus('sending');
    setMessage(null);
    const lang = pageLang();
    const res = await post({
      plant_id: plantId, plant_name: plantName, field: form.field, current_value: current?.raw ?? null, current_display: current?.current ?? '',
      proposed_value: form.proposed.trim(), note: form.note.trim(), release_id: release, climate, locale: lang,
      consent: form.consent, email: form.email.trim(), website: form.website,
    });
    if (res.status === 'sent') drafts.delete(plantId);
    setStatus(res.status);
    setMessage(res.message);
    setErrors(res.errors);
  }

  if (status === 'sent') {
    return (
      <div class="ct-corr-sent">
        <p role="status">{T('correction.sent')}</p>
        <p><button type="button" class="button button-secondary" onClick={() => { setForm((f) => ({ ...f, field: '', proposed: '', note: '' })); setStatus('idle'); }}>{T('correction.another')}</button></p>
      </div>
    );
  }

  const err = (n: Name) => errors[n];
  const described = (n: Name, hint = '') => [hint, err(n) ? `ct-corr-${n}-error` : ''].filter(Boolean).join(' ') || undefined;
  const errorLine = (n: Name) => err(n) ? <p class="ct-field-error" id={`ct-corr-${n}-error`}>{T(err(n)!, { max: n in MAX ? MAX[n as keyof typeof MAX] : '' })}</p> : null;
  const offline = message === 'correction.offline';
  return (
    <form class="ct-corr" noValidate onSubmit={send}>
      <p class="ct-muted">{T('correction.lede')}</p>
      <div class="ct-field">
        <label for="ct-corr-field">{T('correction.field')}</label>
        <select id="ct-corr-field" value={form.field} aria-invalid={!!err('field')} aria-describedby={described('field')} onChange={(e) => set('field', (e.target as HTMLSelectElement).value)}>
          <option value="">{T('correction.fieldChoose')}</option>
          {fields.map((f) => <option value={f.field}>{f.label}</option>)}
        </select>
        {errorLine('field')}
      </div>
      <p class="ct-corr-current"><span class="ct-muted">{T('correction.current')}</span>{' '}
        <output for="ct-corr-field">{!current ? '–' : current.current || <span class="ct-muted">{T('correction.unknown')}</span>}</output>
      </p>
      <div class="ct-field">
        <label for="ct-corr-proposed">{T('correction.proposed')}</label>
        <textarea id="ct-corr-proposed" rows={2} maxLength={MAX.proposed} value={form.proposed} aria-invalid={!!err('proposed')} aria-describedby={described('proposed')} onInput={(e) => set('proposed', (e.target as HTMLTextAreaElement).value)} />
        {errorLine('proposed')}
      </div>
      <div class="ct-field">
        <label for="ct-corr-note">{T('correction.note')}</label>
        <textarea id="ct-corr-note" rows={3} maxLength={MAX.note} value={form.note} aria-invalid={!!err('note')} aria-describedby={described('note', 'ct-corr-note-hint')} onInput={(e) => set('note', (e.target as HTMLTextAreaElement).value)} />
        <p class="ct-muted ct-small" id="ct-corr-note-hint">{T('correction.noteHint')}</p>
        {errorLine('note')}
      </div>
      <div class="ct-field">
        <label for="ct-corr-email">{T('correction.email')}</label>
        <input id="ct-corr-email" type="email" maxLength={MAX.email} autocomplete="email" inputMode="email" value={form.email} aria-invalid={!!err('email')} aria-describedby={described('email', 'ct-corr-privacy')} onInput={(e) => set('email', (e.target as HTMLInputElement).value)} />
        <p class="ct-muted ct-small" id="ct-corr-privacy">{T('correction.privacy')}</p>
        {errorLine('email')}
      </div>
      <div class="ct-corr-consent">
        <label><input id="ct-corr-consent" type="checkbox" checked={form.consent} aria-invalid={!!err('consent')} aria-describedby={described('consent')} onChange={(e) => set('consent', (e.target as HTMLInputElement).checked)} /> <span>{T('correction.consent')}</span></label>
        {errorLine('consent')}
      </div>
      <p class="ct-muted ct-small">{T('correction.context', { plant: plantLabel, release, climate: climateLabel, language: languageName(pageLang()) })}</p>
      <div class="ct-hp" aria-hidden="true">
        <label>{T('correction.honeypot')} <input type="text" tabIndex={-1} autocomplete="off" value={form.website} onInput={(e) => set('website', (e.target as HTMLInputElement).value)} /></label>
      </div>
      <div class="ct-actions">
        {offline
          ? <button type="submit" class="button button-primary">{T('correction.tryAgain')}</button>
          : <button type="submit" class="button button-primary" aria-disabled={status === 'sending' ? 'true' : undefined}>{T('correction.send')}</button>}
        <button type="button" class="button button-secondary" onClick={() => { drafts.delete(plantId); onCancel(); }}>{T('correction.cancel')}</button>
      </div>
      <p class={`ct-corr-status${status === 'failed' ? ' is-error' : ''}`} role="status">{status === 'sending' ? T('correction.sending') : message ? T(message) : ''}</p>
    </form>
  );
}
