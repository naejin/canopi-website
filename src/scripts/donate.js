// The donation dialog's steps (src/components/DonateDialog.astro): amount, payment in HelloAsso's
// iframe, thanks. HelloAsso's iframe is created when the dialog first opens, so the page loads
// nothing from HelloAsso before a visitor wants to give, and the form is ready by "Continue".
// The amount reaches the form by postMessage, which HelloAsso accepts only on the form's first
// step: going back to change it starts a fresh form. HelloAsso posts `payment_completed` (and
// `purchase`) when its thank-you page shows, and that opens ours.
import { openDialog } from './dialogs.js';
import { text } from './page-data.js';

const HELLOASSO = 'https://www.helloasso.com';

export function initDonate() {
  const dialog = document.querySelector('[data-donate-dialog]');
  const form = dialog.querySelector('[data-donate-amount]');
  const frame = dialog.querySelector('[data-donate-frame]');
  const other = form.elements.other;
  let iframe = null;
  let amount = null;
  let sending = 0;

  function step(name, focus) {
    dialog.dataset.step = name;
    focus?.focus({ preventScroll: true });
  }

  function createFrame() {
    iframe?.remove();
    iframe = document.createElement('iframe');
    iframe.title = text('donate.frameTitle');
    iframe.src = frame.dataset.src;
    iframe.allow = "payment 'self' https://paymenthub.helloassopay.com https://helloasso.com";
    iframe.addEventListener('load', () => { frame.querySelector('p')?.remove(); send(); });
    frame.append(iframe);
  }

  // The form may still be starting when the visitor continues, so the amount is sent a few
  // times over a few seconds; HelloAsso keeps the last value until the giver moves on.
  function send() {
    if (amount === null || !iframe) return;
    clearInterval(sending);
    let left = 8;
    const post = () => { iframe.contentWindow?.postMessage({ amount }, HELLOASSO); if (--left <= 0) clearInterval(sending); };
    post();
    sending = setInterval(post, 500);
  }

  function chosen() {
    const typed = Number(other.value);
    if (other.value.trim() && Number.isFinite(typed) && typed >= 1) return Math.round(typed * 100) / 100;
    return Number(form.elements.amount.value);
  }

  other.addEventListener('input', () => {
    for (const radio of form.elements.amount) radio.checked = false;
  });
  form.addEventListener('change', (event) => {
    if (event.target.name === 'amount') other.value = '';
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!other.value.trim() && !form.elements.amount.value) return other.focus();
    amount = chosen();
    step('pay', dialog.querySelector('[data-donate-back]'));
    send();
  });
  dialog.querySelector('[data-donate-back]').addEventListener('click', () => {
    clearInterval(sending);
    amount = null;
    createFrame();
    step('amount', form.querySelector('input:checked') ?? other);
  });

  window.addEventListener('message', (event) => {
    if (event.origin !== HELLOASSO || event.source !== iframe?.contentWindow) return;
    const kind = event.data?.event;
    if (kind !== 'payment_completed' && kind !== 'purchase') return;
    clearInterval(sending);
    step('thanks', dialog.querySelector('[data-donate-thanks]'));
  });

  // A dialog closed after a gift opens on a fresh amount step next time.
  dialog.addEventListener('close', () => {
    if (dialog.dataset.step !== 'thanks') return;
    amount = null;
    createFrame();
    step('amount');
  });

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open-donate]');
    if (!opener) return;
    if (!iframe) createFrame();
    openDialog(dialog, opener);
  });
}
