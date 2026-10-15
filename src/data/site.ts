import type { Locale } from '../i18n/utils';

export const WEB_URL = 'https://web.projectcanopi.com/';
export const SOURCE_URL = 'https://github.com/naejin/canopi';
// The documentation slot: header and footer show a Docs link once this is set.
export const DOCS_URL: string | null = null;
// The donation form's own page, and `view=form`, the bare form without the campaign header.
export const HELLOASSO_FORM_URL = 'https://www.helloasso.com/associations/canopi/formulaires/1';
export const HELLOASSO_WIDGET_URL = 'https://www.helloasso.com/associations/canopi/formulaires/1/widget?view=form';
// The donation dialog's preset amounts in euros, the same as the HelloAsso form's tiers, with
// the default each starts on (HelloAsso's "popular" tier).
export const DONATION_AMOUNTS = {
  oneTime: { amounts: [10, 25, 50, 100, 250], default: 50 },
  monthly: { amounts: [5, 10, 20, 40], default: 10 },
} as const;

export function discordUrl(lang: Locale): string {
  return lang === 'fr' ? 'https://discord.gg/7wq9HsBdsc' : 'https://discord.gg/k7bsyjD9b8';
}
