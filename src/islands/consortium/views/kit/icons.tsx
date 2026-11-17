/** @jsxImportSource preact */
// The island's glyphs, one drawing each (aria-hidden; the text beside or a hidden label carries the
// meaning, never colour alone). Two forms: the sheets' marks (WARN, INFO, CLOSE, BACK: an element with class
// ct-glyph) and the views' component (WarnIcon: no class, not focusable), drawn with the same paths.
// The pin, sprout and chevron of Kept, Main crops and the stepper went in PP-B commit 0a'.
const warnPaths = <><path d="M8 1.6 15 14H1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /><path d="M8 6v4" stroke="currentColor" stroke-width="1.7" /><circle cx="8" cy="12" r="1" fill="currentColor" /></>;
const leftPath = 'M10 3 5 8l5 5';

// ---- the sheets' marks ----
export const WARN = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true">{warnPaths}</svg>;
export const CLOSE = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13" stroke="currentColor" stroke-width="1.8" /></svg>;
export const INFO = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M8 7.2v4" stroke="currentColor" stroke-width="1.6" /><circle cx="8" cy="5" r="0.9" fill="currentColor" /></svg>;
export const BACK = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d={leftPath} fill="none" stroke="currentColor" stroke-width="1.8" /></svg>;

// ---- the views' glyph ----
export const WarnIcon = () => <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">{warnPaths}</svg>;
