// What every page shares: dialogs, donations, the language menu and the theme toggle.
import { initDialogs } from './dialogs.js';
import { initDonate } from './donate.js';
import { text } from './page-data.js';

const root = document.documentElement;
export const isDark = () => root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);

// onThemeChange runs now and after every theme change, for canvases that draw with the tokens.
export function initChrome({ onThemeChange = () => {} } = {}) {
  initDialogs();
  initDonate();

  const langMenu = document.querySelector('[data-lang-menu]');
  document.addEventListener('click', (event) => { if (!langMenu.contains(event.target)) langMenu.open = false; });
  langMenu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { langMenu.open = false; langMenu.querySelector('summary').focus(); }
  });

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
