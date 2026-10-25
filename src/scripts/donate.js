// The donation dialog's steps (src/components/DonateDialog.astro): amount, payment in HelloAsso's
// iframe, thanks. HelloAsso's iframe is created when the dialog first opens, so the page loads
// nothing from HelloAsso before a visitor wants to give, and the form is ready by "Continue".
// The amount reaches the form by postMessage, which HelloAsso accepts only on the form's first
// step: going back to change it starts a fresh form. HelloAsso posts `payment_completed` (and
// `purchase`) when its thank-you page shows, and that opens ours. If the form has not loaded
// after a while (a blocker, a slow network), the dialog offers the form's own page instead.
// /#donate opens the dialog, so the app and the README can link straight to it.
import { openDialog } from './dialogs.js';
import { text } from './page-data.js';

const HELLOASSO = 'https://www.helloasso.com';
const SLOW_MS = 10000;

export function initDonate() {
  const dialog = document.querySelector('[data-donate-dialog]');
  const form = dialog.querySelector('[data-donate-amount]');
  const frame = dialog.querySelector('[data-donate-frame]');
  const other = form.elements.other;
  const sets = form.querySelectorAll('[data-frequency]');
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
    const status = frame.querySelector('[data-donate-status]');
    const slow = setTimeout(() => {
      if (!status) return;
      status.textContent = `${text('donate.slow')} `;
      const link = dialog.querySelector('.donate-open').cloneNode(true);
      status.append(link);
    }, SLOW_MS);
    iframe.addEventListener('load', () => { clearTimeout(slow); status?.remove(); iframe.hidden = false; send(); });
    iframe.hidden = true;
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

  // One-time and monthly gifts have their own amounts; only the chosen frequency's set shows, and
  // the payment step reminds a monthly giver to pick monthly in HelloAsso's form.
  const amounts = () => form.elements[`amount-${form.elements.frequency.value}`];
  function showFrequency() {
    const frequency = form.elements.frequency.value;
    dialog.dataset.frequency = frequency;
    for (const set of sets) set.hidden = set.dataset.frequency !== frequency;
  }

  function chosen() {
    const typed = Number(other.value);
    if (other.value.trim() && Number.isFinite(typed) && typed >= 1) return Math.round(typed * 100) / 100;
    return Number(amounts().value);
  }

  other.addEventListener('input', () => {
    for (const radio of amounts()) radio.checked = false;
  });
  form.addEventListener('change', (event) => {
    if (event.target.name === 'frequency') showFrequency();
    else if (event.target.name.startsWith('amount-')) other.value = '';
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!other.value.trim() && !amounts().value) return other.focus();
    amount = chosen();
    step('pay', dialog.querySelector('[data-donate-back]'));
    send();
  });
  dialog.querySelector('[data-donate-back]').addEventListener('click', () => {
    clearInterval(sending);
    amount = null;
    createFrame();
    step('amount', form.querySelector('fieldset:not([hidden]) [name^="amount-"]:checked') ?? other);
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

  // The dialog gives the focus back to the button that opened it, or, for the Donate button in the
  // phone Menu (closed as the dialog opens), to the Menu's summary.
  function open(opener) {
    if (!iframe) createFrame();
    openDialog(dialog, opener?.closest('[data-nav-menu]')?.querySelector('summary') ?? opener);
  }
  showFrequency();
  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open-donate]');
    if (opener) open(opener);
  });
  // From a #donate link the dialog gives the focus back, on closing, to the first Donate button on
  // screen (the header's below 640px is inside the closed Menu, so the footer's).
  const shownOpener = () => [...document.querySelectorAll('[data-open-donate]')].find((button) => button.getClientRects().length);
  const fromLink = () => { if (location.hash === '#donate') open(shownOpener()); };
  window.addEventListener('hashchange', fromLink);
  fromLink();
  dialog.addEventListener('close', () => {
    if (location.hash === '#donate') history.replaceState(null, '', location.pathname + location.search);
  });
}
