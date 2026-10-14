// Hero actions and the installer dialog. The primary button names the visitor's system and
// links straight to its installer; unknown devices get Canopi Web as the primary action.
import { detectInstaller, isMacDesktop } from '../lib/installer.mjs';
import { openDialog } from './dialogs.js';
import { installers, text } from './page-data.js';

const WEB_URL = document.querySelector('[data-primary-action]').href;

const primary = document.querySelector('[data-primary-action]');
const secondary = document.querySelector('[data-secondary-action]');
const macChooser = document.querySelector('[data-mac-chooser]');
const installNote = document.querySelector('[data-install-note]');
const dialog = document.querySelector('[data-downloads-dialog]');

function setAction(link, { href, label, arrow, installer }) {
  link.href = href;
  link.textContent = `${label} `;
  const mark = document.createElement('span');
  mark.setAttribute('aria-hidden', 'true');
  mark.textContent = arrow;
  link.append(mark);
  delete link.dataset.openDownloads;
  delete link.dataset.macChoice;
  if (installer) link.dataset.installer = installer;
  else delete link.dataset.installer;
}

function render(platform = '', architecture = '', bitness = '') {
  const ua = navigator.userAgent;
  const key = detectInstaller(ua, platform, architecture, navigator.maxTouchPoints, bitness);
  const unsureMac = !key && isMacDesktop(ua, platform, navigator.maxTouchPoints);
  macChooser.hidden = !unsureMac;
  for (const chip of macChooser.querySelectorAll('[data-installer]')) chip.href = installers[chip.dataset.installer].url;

  const web = { href: WEB_URL, label: text('edition.web.cta'), arrow: '↗' };
  if (key) {
    setAction(primary, { href: installers[key].url, label: installers[key].label, arrow: '↓', installer: key });
    setAction(secondary, web);
  } else if (unsureMac) {
    // Safari and Firefox do not reveal the Mac's chip: the two chips under the buttons decide.
    setAction(primary, { href: '#', label: text('download.forPlatform', { platform: 'Mac' }), arrow: '↓' });
    primary.dataset.macChoice = '';
    setAction(secondary, web);
  } else {
    setAction(primary, web);
    setAction(secondary, { href: '#', label: text('edition.desktop.cta'), arrow: '↓' });
    secondary.dataset.openDownloads = '';
  }

  // The dialog's list is rendered by the page; mark this computer's installer in it.
  for (const link of dialog.querySelectorAll('.installer[data-installer]')) {
    const item = installers[link.dataset.installer];
    const mine = link.dataset.installer === key;
    if (mine) link.dataset.recommended = 'true';
    else delete link.dataset.recommended;
    link.querySelector('[data-installer-name]').textContent = mine ? text('download.thisComputer', { name: item.name }) : item.name;
  }
}

export function initDownloads() {
  render();
  navigator.userAgentData?.getHighEntropyValues?.(['platform', 'architecture', 'bitness'])
    .then((data) => render(data.platform, data.architecture, data.bitness))
    .catch(() => {});

  document.addEventListener('click', (event) => {
    const target = event.target.closest('a, button');
    if (!target || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (target.matches('[data-open-downloads]')) {
      event.preventDefault();
      openDialog(dialog, target);
    } else if (target.matches('[data-mac-choice]')) {
      event.preventDefault();
      macChooser.querySelector('a')?.focus();
    } else if (target.dataset.installer) {
      // The download starts; say what to do next, where the visitor is looking.
      installNote.textContent = text('download.after', { instruction: installers[target.dataset.installer].after });
      installNote.hidden = false;
      if (dialog.open) dialog.close();
    }
  });
}
