// Hero actions and the installer dialog. The primary button names the visitor's system and
// links straight to its installer; unknown devices get Canopi Web as the primary action.
import { detectInstaller, isMacDesktop } from './installer.mjs';
import { openDialog } from './dialogs.js';

const BASE = 'https://github.com/naejin/canopi/releases/latest/download';
const WEB_URL = 'https://web.projectcanopi.com/';

export const INSTALLERS = {
  windows: { group: 'Windows', name: 'Windows installer', detail: '.exe · 64-bit Intel or AMD', url: `${BASE}/canopi-windows-x64.exe`, label: 'Download for Windows', after: 'Open the installer from your Downloads folder and follow the steps.' },
  'windows-msi': { group: 'Windows', name: 'Windows MSI package', detail: '.msi · for managed computers', url: `${BASE}/canopi-windows-x64.msi`, after: 'Open the .msi from your Downloads folder and follow the steps.' },
  'mac-arm': { group: 'macOS', name: 'Mac with Apple silicon', detail: '.dmg · M1 and later', url: `${BASE}/canopi-macos-arm64.dmg`, label: 'Download for Mac', after: 'Open the .dmg, then drag Canopi into Applications.' },
  'mac-intel': { group: 'macOS', name: 'Mac with Intel', detail: '.dmg', url: `${BASE}/canopi-macos-x64.dmg`, label: 'Download for Mac (Intel)', after: 'Open the .dmg, then drag Canopi into Applications.' },
  linux: { group: 'Linux', name: 'AppImage', detail: 'any distribution · 64-bit', url: `${BASE}/canopi-linux-x64.AppImage`, label: 'Download for Linux', after: 'Allow the AppImage to run as a program in its file Properties, then open it.' },
  'linux-deb': { group: 'Linux', name: 'DEB package', detail: 'Ubuntu, Debian and derivatives', url: `${BASE}/canopi-linux-x64.deb`, after: 'Open the .deb with your software installer and choose Install.' },
};

const primary = document.querySelector('[data-primary-action]');
const secondary = document.querySelector('[data-secondary-action]');
const macChooser = document.querySelector('[data-mac-chooser]');
const installNote = document.querySelector('[data-install-note]');
const dialog = document.querySelector('[data-downloads-dialog]');
const list = document.querySelector('[data-installer-list]');

let recommended = null;

function setAction(link, { href, text, arrow, installer }) {
  link.href = href;
  link.textContent = `${text} `;
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
  recommended = key;
  macChooser.hidden = !unsureMac;
  for (const chip of macChooser.querySelectorAll('[data-installer]')) chip.href = INSTALLERS[chip.dataset.installer].url;

  if (key) {
    setAction(primary, { href: INSTALLERS[key].url, text: INSTALLERS[key].label, arrow: '↓', installer: key });
    setAction(secondary, { href: WEB_URL, text: 'Open Canopi Web', arrow: '↗' });
  } else if (unsureMac) {
    // Safari and Firefox do not reveal the Mac's chip: the two chips under the buttons decide.
    setAction(primary, { href: '#', text: 'Download for Mac', arrow: '↓' });
    primary.dataset.macChoice = '';
    setAction(secondary, { href: WEB_URL, text: 'Open Canopi Web', arrow: '↗' });
  } else {
    setAction(primary, { href: WEB_URL, text: 'Open Canopi Web', arrow: '↗' });
    setAction(secondary, { href: '#', text: 'Download Canopi Desktop', arrow: '↓' });
    secondary.dataset.openDownloads = '';
  }
  renderList();
}

function renderList() {
  list.replaceChildren();
  const groups = new Map();
  for (const [key, item] of Object.entries(INSTALLERS)) {
    if (!groups.has(item.group)) groups.set(item.group, []);
    groups.get(item.group).push([key, item]);
  }
  for (const [group, items] of groups) {
    const section = document.createElement('div');
    section.className = 'installer-group';
    const title = document.createElement('h4');
    title.textContent = group;
    const ul = document.createElement('ul');
    ul.setAttribute('role', 'list');
    for (const [key, item] of items) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.className = 'installer';
      a.href = item.url;
      a.dataset.installer = key;
      if (key === recommended) a.dataset.recommended = 'true';
      const name = document.createElement('strong');
      name.textContent = key === recommended ? `${item.name} (this computer)` : item.name;
      const detail = document.createElement('span');
      detail.textContent = item.detail;
      a.append(name, detail);
      li.append(a);
      ul.append(li);
    }
    section.append(title, ul);
    list.append(section);
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
      const note = `After downloading: ${INSTALLERS[target.dataset.installer].after}`;
      installNote.textContent = note;
      installNote.hidden = false;
      if (dialog.open) dialog.close();
    }
  });
}
