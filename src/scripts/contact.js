// The contact form: checks fields in place, then posts to /api/contact and shows the answer
// without leaving the page. The endpoint answers JSON to this script and redirects plain forms.
import { text } from './page-data.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// The endpoint's error codes and the sentence each one shows (src/lib/contact.mjs).
const MESSAGES = { invalid: 'contact.invalid', refused: 'contact.refused' };

export function initContact(form) {
  const status = form.querySelector('[data-form-status]');
  const button = form.querySelector('[type="submit"]');
  const fields = {
    name: { input: form.elements.name, valid: (v) => v.trim().length > 0 },
    email: { input: form.elements.email, valid: (v) => EMAIL.test(v.trim()) },
    message: { input: form.elements.message, valid: (v) => v.trim().length > 0 },
  };

  function check(key) {
    const { input, valid } = fields[key];
    const ok = valid(input.value);
    const error = document.getElementById(`${input.id}-error`);
    input.setAttribute('aria-invalid', String(!ok));
    if (ok) input.removeAttribute('aria-describedby');
    else input.setAttribute('aria-describedby', error.id);
    error.hidden = ok;
    return ok;
  }

  for (const key of Object.keys(fields)) {
    fields[key].input.addEventListener('blur', () => { if (fields[key].input.value) check(key); });
    fields[key].input.addEventListener('input', () => { if (fields[key].input.getAttribute('aria-invalid') === 'true') check(key); });
  }

  function show(message, isError) {
    status.classList.toggle('is-error', isError);
    status.textContent = message;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const results = Object.keys(fields).map(check);
    if (results.includes(false)) {
      Object.values(fields).find((f) => f.input.getAttribute('aria-invalid') === 'true')?.input.focus();
      return;
    }
    button.disabled = true;
    form.classList.remove('is-sent');
    show(text('contact.sending'), false);
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.ok) {
        form.classList.add('is-sent');
        show(text('contact.sent'), false);
        form.reset();
      } else {
        show(text(MESSAGES[result.code] ?? 'contact.failed'), true);
      }
    } catch {
      show(text('contact.failed'), true);
    } finally {
      button.disabled = false;
    }
  });
}
