// B3 Bibliography drawn book boards: theme -> non-green Canopi notebook tones
// (ochre, umber, clay, slate — never green, which is reserved for plant data)
// plus spine short titles for long titles so boards stay legible at >= 12 px.

export type BookBoardTone = 'ochre' | 'umber' | 'clay' | 'slate';

const THEME_TONES: Readonly<Record<string, BookBoardTone>> = {
  agroecology: 'ochre',
  seeds: 'ochre',
  soil: 'umber',
  'indigenous-knowledge': 'umber',
  forests: 'clay',
  biodiversity: 'clay',
  plants: 'clay',
  water: 'slate',
  'growing-structures': 'slate',
};

export function boardToneForTheme(themeKey: string): BookBoardTone {
  return THEME_TONES[themeKey] ?? 'ochre';
}

const SPINE_SHORT_BY_ID: Readonly<Record<string, string>> = {
  'reinventer-le-potager': 'Réinventer le potager',
  'plantes-bio-indicatrices': 'Plantes bio-indicatrices',
  'foret-primaire': 'Pour une forêt primaire',
  'biodiversite-humanisme': 'La biodiversité comme un humanisme',
  'abeilles-sauvages': 'Nos abeilles sauvages',
  'pollinator-victory-garden': 'Pollinator Victory Garden',
  walipini: 'Walipini Design',
  'plants-have-so-much-to-give-us': 'Plants Have So Much to Give Us',
};

/** Concise title for the drawn book board (full title remains in the adjacent link). */
export function spineTitleOf(bookId: string | undefined, shownTitle: string): string {
  if (bookId && SPINE_SHORT_BY_ID[bookId]) return SPINE_SHORT_BY_ID[bookId];
  const clean = shownTitle.replace(/\s*[!?]\s*$/, '').trim();
  if (/^Collaborer avec les bactéries/i.test(clean)) return 'Collaborer avec les bactéries';
  if (clean.length <= 34) return clean;
  // Fall back to trimming cleanly at a word boundary without ellipsis
  const words = clean.split(/\s+/);
  let out = '';
  for (const w of words) {
    if ((out + ' ' + w).trim().length > 32) break;
    out = (out + ' ' + w).trim();
  }
  return out || clean.slice(0, 32);
}

/** Sentence-cased localized language name for visible "Also in" tags (zero tooltip-only codes). */
export function localizedLanguageName(displayNames: Intl.DisplayNames, code: string): string {
  const raw = displayNames.of(code) ?? code;
  return raw ? raw.charAt(0).toLocaleUpperCase() + raw.slice(1) : code;
}
