import type { Locale } from '../i18n/utils';

export const WEB_URL = 'https://web.projectcanopi.com/';
export const SOURCE_URL = 'https://github.com/naejin/canopi';
// The documentation slot: header and footer show a Docs link once this is set.
export const DOCS_URL: string | null = null;
// `view=form` is the bare form, without the campaign header.
export const HELLOASSO_WIDGET_URL = 'https://www.helloasso.com/associations/canopi/formulaires/1/widget?view=form';
// The donation dialog's preset amounts in euros, the same as HelloAsso's form; the default is
// HelloAsso's "favourite".
export const DONATION_AMOUNTS = [20, 50, 100, 150, 500];
export const DONATION_DEFAULT = 50;

export function discordUrl(lang: Locale): string {
  return lang === 'fr' ? 'https://discord.gg/7wq9HsBdsc' : 'https://discord.gg/k7bsyjD9b8';
}
