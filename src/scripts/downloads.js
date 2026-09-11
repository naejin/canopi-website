import { detectInstaller, isMacDesktop } from "../lib/installer.mjs";

(() => {
  const dialog = document.querySelector('#download-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const chooser = document.querySelector('#download-options');
  const recommendation = document.querySelector('#recommended-download');
  const note = document.querySelector('#install-guidance');
  const ua = navigator.userAgent;
  let opener;
  let interacted = false;
  document.querySelector('#dialog-options').append(chooser);
  dialog.append(note);
  document.querySelector('#download-fallback').hidden = true;
  const messages = JSON.parse(document.querySelector('#download-messages').textContent);
  function recommend(platform = '', architecture = '', bitness = '') {
    if (interacted) return;
    const key = detectInstaller(ua, platform, architecture, navigator.maxTouchPoints, bitness);
    recommendation.replaceChildren();
    chooser.open = false;
    if (key) {
      const source = chooser.querySelector(`[data-installer="${key}"]`);
      const name = source.dataset.platform;
      const detail = source.dataset.detail;
      const text = document.createElement('p');
      text.textContent = `${name} · ${detail}`;
      const link = chooser.querySelector(`[data-installer="${key}"]`).cloneNode(true);
      link.className = 'button primary recommended-button';
      link.textContent = `${messages.forPlatform.replace('{platform}', name)} ↓`;
      recommendation.append(text, link);
    } else if (isMacDesktop(ua, platform, navigator.maxTouchPoints)) {
      const text = document.createElement('p');
      text.textContent = messages.pickMac;
      recommendation.append(text);
      for (const chip of ['mac-arm', 'mac-intel']) {
        const link = chooser.querySelector(`[data-installer="${chip}"]`).cloneNode(true);
        link.className = 'button secondary chip-button';
        recommendation.append(link);
      }
      const help = document.createElement('p');
      help.className = 'caption';
      help.textContent = messages.helpMac;
      recommendation.append(help);
    } else {
      const text = document.createElement('p');
      text.textContent = messages.unknown;
      const web = document.createElement('a');
      web.href = 'https://web.projectcanopi.com/';
      web.className = 'button primary recommended-button';
      web.textContent = `${messages.web} ↗`;
      recommendation.append(text, web);
      chooser.open = true;
    }
  }
  document.querySelector('[data-desktop-download]').setAttribute('aria-haspopup', 'dialog');
  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.getAttribute('href') === '#download-options') {
      event.preventDefault();
      opener = link;
      dialog.showModal();
      document.body.classList.add('download-window-open');
    }
    if (link.dataset.installer) {
      interacted = true;
      note.textContent = messages.after.replace('{instruction}', link.dataset.instruction);
    }
  });
  chooser.addEventListener('toggle', () => { if (dialog.open) interacted = true; });
  document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const box = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('download-window-open');
    opener?.focus({ preventScroll: true });
  });
  recommend();
  navigator.userAgentData?.getHighEntropyValues?.(['platform', 'architecture', 'bitness']).then(data => recommend(data.platform, data.architecture, data.bitness)).catch(() => {});
})();
