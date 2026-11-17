/** @jsxImportSource preact */
// The island's glyphs, one drawing each (aria-hidden; the text beside or a hidden label carries the
// meaning, never colour alone). Two forms: the sheets' marks (WARN, CLOSE, BACK: an element with class
// ct-glyph) and the views' component (WarnIcon: no class, not focusable), drawn with the same paths.
// The pin, sprout and chevron of Kept, Main crops and the stepper went in PP-B commit 0a'.
import type { Stratum } from '../../../../lib/consortium/index.ts';
const warnPaths = <><path d="M8 1.6 15 14H1z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" /><path d="M8 6v4" stroke="currentColor" stroke-width="1.7" /><circle cx="8" cy="12" r="1" fill="currentColor" /></>;
const leftPath = 'M10 3 5 8l5 5';

// ---- the sheets' marks ----
export const WARN = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true">{warnPaths}</svg>;
export const CLOSE = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d="m3 3 10 10M13 3 3 13" stroke="currentColor" stroke-width="1.8" /></svg>;
export const BACK = <svg class="ct-glyph" viewBox="0 0 16 16" aria-hidden="true"><path d={leftPath} fill="none" stroke="currentColor" stroke-width="1.8" /></svg>;

// ---- the views' glyph ----
export const WarnIcon = () => <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">{warnPaths}</svg>;

// A light level (pf hand-off; boards Main, PaletteMore, the "Layer is light" rule): a small sun disc
// filled clockwise from the top to its share of light, full sun whole, mostly sun three quarters, part
// shade half, shade a quarter, in the ochre accent (--accent, light and dark). Always beside its words
// (consortium.palette.light_*), never alone.
const LIGHT_FILL: Record<Stratum, string> = {
  emergent: 'M6 .75A5.25 5.25 0 0 1 6 11.25A5.25 5.25 0 0 1 6 .75Z',
  high: 'M6 6V.75A5.25 5.25 0 1 1 .75 6Z',
  medium: 'M6 6V.75A5.25 5.25 0 0 1 6 11.25Z',
  low: 'M6 6V.75A5.25 5.25 0 0 1 11.25 6Z',
};
export const LightIcon = ({ stratum }: { stratum: Stratum }) => (
  <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false" data-light={stratum} style={{ color: 'var(--accent)', flex: 'none' }}>
    <path d={LIGHT_FILL[stratum]} fill="currentColor" />
    <circle cx="6" cy="6" r="5.25" fill="none" stroke="currentColor" stroke-width="1.5" />
  </svg>
);
