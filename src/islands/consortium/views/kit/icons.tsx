/** @jsxImportSource preact */
// The island's glyphs, one drawing each (aria-hidden; the text beside or a hidden label carries the
// meaning, never colour alone). Two forms: the sheets' marks (PIN, SPROUT, WARN, CLOSE, BACK: an
// element with class ct-glyph) and the views' components (WarnIcon, PinIcon, SproutIcon, ChevronIcon:
// no class, not focusable), drawn with the same paths.
const warnPaths = <><path d="M8 1.6 15 14H1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /><path d="M8 6v4" stroke="currentColor" stroke-width="1.7" /><circle cx="8" cy="12" r="1" fill="currentColor" /></>;
const pinPath = <path d="M5 1.5h6l-1 4 3 3H3l3-3z M8 8.5V15" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />;
const sproutPaths = <><path d="M8 15V7" stroke="currentColor" stroke-width="1.8" /><path d="M8 8C8 4.5 5.5 2.5 2 2.5c0 3.5 2.5 5.5 6 5.5zM8 9.5c0-3 2.2-5 6-5 0 3-2.2 5-6 5z" fill="currentColor" /></>;
const leftPath = 'M10 3 5 8l5 5';

// ---- the sheets' marks ----
export const PIN = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true">{pinPath}</svg>;
export const SPROUT = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true">{sproutPaths}</svg>;
export const WARN = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true">{warnPaths}</svg>;
export const CLOSE = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13" stroke="currentColor" stroke-width="1.8" /></svg>;
export const BACK = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d={leftPath} fill="none" stroke="currentColor" stroke-width="1.8" /></svg>;

// ---- the views' glyphs ----
export const WarnIcon = () => <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">{warnPaths}</svg>;
export const PinIcon = () => <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">{pinPath}</svg>;
export const SproutIcon = () => <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">{sproutPaths}</svg>;
export const ChevronIcon = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg class="ct-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d={dir === 'left' ? leftPath : 'm6 3 5 5-5 5'} fill="none" stroke="currentColor" stroke-width="1.8" /></svg>
);
