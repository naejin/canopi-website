// Donations: HelloAsso's form in our own dialog. The iframe is created on first open only,
// so the page loads nothing from HelloAsso until a visitor wants to give.
import { openDialog } from './dialogs.js';

const WIDGET_URL = 'https://www.helloasso.com/associations/canopi/formulaires/1/widget?view=overlay';

export function initDonate() {
  const dialog = document.querySelector('[data-donate-dialog]');
  const frame = dialog.querySelector('[data-donate-frame]');
  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open-donate]');
    if (!opener) return;
    if (!frame.querySelector('iframe')) {
      const iframe = document.createElement('iframe');
      iframe.title = 'Donation form (HelloAsso)';
      iframe.src = WIDGET_URL;
      iframe.allow = "payment 'self' https://paymenthub.helloassopay.com https://helloasso.com";
      iframe.addEventListener('load', () => frame.querySelector('p')?.remove(), { once: true });
      frame.append(iframe);
    }
    openDialog(dialog, opener);
  });
}
