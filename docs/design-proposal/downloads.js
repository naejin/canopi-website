// Keep uncertain devices in the chooser instead of guessing an installer.
function detectInstaller(ua, platform, architecture, touchPoints = 0) {
  const device = `${platform} ${ua}`;
  if (/Android|iPhone|iPad|iPod|CrOS/i.test(device) || (/Mac/i.test(device) && touchPoints > 1)) return null;
  const arm = /arm|aarch/i.test(architecture || ua);
  if (/Windows/i.test(device)) return arm ? null : 'windows';
  if (/Mac/i.test(device)) {
    if (!architecture) return null;
    return arm ? 'mac-arm' : /x86|x64/i.test(architecture) ? 'mac-intel' : null;
  }
  if (/Linux/i.test(device)) return arm ? null : /x86_64|amd64|x64|x86/i.test(`${architecture} ${ua}`) ? 'linux' : null;
  return null;
}

(() => {
  const chooser = document.querySelector('#download-options');
  const primaryLinks = [...document.querySelectorAll('[data-desktop-download]')];
  const labels = { windows: 'Download for Windows', 'mac-arm': 'Download for Mac', 'mac-intel': 'Download for Mac', linux: 'Download for Linux' };
  const guidance = {
    windows: 'Open the downloaded .exe file from your Downloads folder and follow the installer steps.',
    msi: 'Open the downloaded .msi file from your Downloads folder and follow the installer steps.',
    'mac-arm': 'Open the downloaded .dmg file, then drag Canopi into Applications.',
    'mac-intel': 'Open the downloaded .dmg file, then drag Canopi into Applications.',
    linux: 'In your Downloads folder, open the AppImage file’s Properties and allow it to run as a program. Then open the file.',
    deb: 'Open the downloaded .deb file with your software installer and choose Install.'
  };

  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.getAttribute('href') === '#download-options') {
      event.preventDefault();
      chooser.open = true;
      chooser.querySelector('summary').focus({ preventScroll: true });
      chooser.scrollIntoView({ block: 'start' });
    }
    if (link.dataset.installer) {
      const note = document.querySelector('#install-guidance');
      note.textContent = `After downloading: ${guidance[link.dataset.installer]} If the download does not start, use the same download link to try again.`;
      // Let the attachment link proceed normally; the page cannot confirm completion.
      const container = link.closest('.intro, .edition-grid article, .installer-grid');
      container.append(note);
    }
  });

  const apply = (platform = '', architecture = '') => {
    primaryLinks.forEach(link => {
      link.href = '#download-options';
      delete link.dataset.installer;
      link.querySelector('[data-download-label]').textContent = 'Download Canopi Desktop';
    });
    const key = detectInstaller(navigator.userAgent, platform, architecture, navigator.maxTouchPoints);
    if (!key) return;
    const source = chooser.querySelector(`[data-installer="${key}"]`);
    primaryLinks.forEach(link => {
      link.href = source.href;
      link.dataset.installer = key;
      link.querySelector('[data-download-label]').textContent = labels[key];
    });
  };
  apply();
  const hints = navigator.userAgentData;
  if (hints?.getHighEntropyValues) {
    hints.getHighEntropyValues(['platform', 'architecture']).then(data => apply(data.platform, data.architecture)).catch(() => {});
  }
})();
