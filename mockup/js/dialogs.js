// Native <dialog> helpers: open modally, close on Escape (native), the close button or a
// click on the backdrop, and give focus back to whatever opened it.
const openers = new WeakMap();

export function openDialog(dialog, opener) {
  if (!dialog || dialog.open) return;
  openers.set(dialog, opener ?? document.activeElement);
  dialog.showModal();
  document.documentElement.style.overflow = 'hidden';
}

export function initDialogs() {
  for (const dialog of document.querySelectorAll('dialog')) {
    dialog.addEventListener('click', (event) => {
      if (event.target.closest('[data-close-dialog]')) return dialog.close();
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      const outside = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
      if (outside) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.documentElement.style.overflow = '';
      openers.get(dialog)?.focus?.({ preventScroll: true });
    });
  }
}
