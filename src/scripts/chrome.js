// What every page shares: dialogs, donations, the language and phone menus, the theme toggle and the
// reader's climate.
import { initDialogs } from './dialogs.js';
import { initDonate } from './donate.js';
import { initClimate } from './climate.js';
import { text } from './page-data.js';

const root = document.documentElement;
export const isDark = () => root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);

// onThemeChange runs now and after every theme change, for canvases that draw with the tokens.
export function initChrome({ onThemeChange = () => {} } = {}) {
  initDialogs();
  initDonate();
  initClimate();

  // The language menu and the phone Menu (only one shows at any width) close on an outside click, on
  // Escape (which gives the focus back to the summary), when the focus moves out of them, and when one
  // of their links or buttons is used (Contact is a link within the page, Donate opens a dialog).
  const menus = [...document.querySelectorAll('[data-lang-menu], [data-nav-menu]')];
  document.addEventListener('click', (event) => {
    for (const menu of menus) if (!menu.contains(event.target)) menu.open = false;
  });
  for (const menu of menus) {
    const summary = menu.querySelector('summary');
    menu.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.open) { menu.open = false; summary.focus(); }
    });
    menu.addEventListener('focusout', (event) => {
      if (event.relatedTarget && !menu.contains(event.relatedTarget)) menu.open = false;
    });
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) menu.open = false;
    });
  }

  const toggle = document.querySelector('[data-theme-toggle]');
  const apply = () => {
    toggle.setAttribute('aria-label', text(isDark() ? 'header.themeLight' : 'header.themeDark'));
    onThemeChange();
  };
  toggle.addEventListener('click', () => {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    try { localStorage.setItem('canopi-theme', root.dataset.theme); } catch {}
    apply();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!root.dataset.theme) apply(); });
  apply();
}
