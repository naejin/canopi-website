// Single shared drawn botanical & status glyph vocabulary (Wave 1).
// 16×16 integer grid, 1.4 px stroke, round caps & joins, currentColor (free dark mode & black-only print).
// Consumed by both src/components/Glyph.astro and src/islands/palette/views/kit/Glyph.tsx.

export const GLYPH_VIEWBOX = '0 0 16 16';
export const GLYPH_STROKE_WIDTH = 1.4;

export type GlyphName =
  | 'bloom'
  | 'fruit'
  | 'bloom-fruit'
  | 'sow'
  | 'fits'
  | 'check'
  | 'risk'
  | 'job-food'
  | 'job-soil'
  | 'job-helpers'
  | 'job-mulch'
  | 'job-ground'
  | 'job-shelter';

export interface GlyphPrimitive {
  readonly tag: 'path' | 'circle' | 'ellipse';
  readonly attrs: Readonly<Record<string, string | number>>;
  readonly tone?: 'bloom' | 'fruit';
}

export const GLYPH_PRIMITIVES: Readonly<Record<GlyphName, readonly GlyphPrimitive[]>> = {
  // Open 5-petal blossom
  bloom: [
    { tag: 'circle', attrs: { cx: 8, cy: 8, r: 1.5, fill: 'currentColor', stroke: 'none' } },
    { tag: 'circle', attrs: { cx: 8, cy: 3.8, r: 2.1 } },
    { tag: 'circle', attrs: { cx: 12, cy: 6.7, r: 2.1 } },
    { tag: 'circle', attrs: { cx: 10.5, cy: 11.4, r: 2.1 } },
    { tag: 'circle', attrs: { cx: 5.5, cy: 11.4, r: 2.1 } },
    { tag: 'circle', attrs: { cx: 4, cy: 6.7, r: 2.1 } },
  ],

  // Drupe with stalk and small leaf
  fruit: [
    {
      tag: 'path',
      attrs: {
        d: 'M8 5.2 C4.9 5.2 3.4 7.4 3.4 9.8 C3.4 12.6 5.4 14.3 8 14.3 C10.6 14.3 12.6 12.6 12.6 9.8 C12.6 7.4 11.1 5.2 8 5.2 Z',
        fill: 'currentColor',
        'fill-opacity': 0.18,
      },
    },
    { tag: 'path', attrs: { d: 'M8 5.2 C8 3.6 8.8 2.4 10 1.8' } },
    { tag: 'path', attrs: { d: 'M8.5 3.8 C10.4 3.1 12.2 3.7 12.8 5.2 C11.1 5.6 9.4 5.1 8.5 3.8 Z' } },
  ],

  // Composite: upper-left 5-petal mini blossom (~8.5px) + lower-right drupe (~8.5px)
  'bloom-fruit': [
    { tag: 'circle', tone: 'bloom', attrs: { cx: 4.8, cy: 4.8, r: 0.9, fill: 'currentColor', stroke: 'none' } },
    { tag: 'circle', tone: 'bloom', attrs: { cx: 4.8, cy: 2.3, r: 1.25, 'stroke-width': 1.25 } },
    { tag: 'circle', tone: 'bloom', attrs: { cx: 7.2, cy: 4.0, r: 1.25, 'stroke-width': 1.25 } },
    { tag: 'circle', tone: 'bloom', attrs: { cx: 6.3, cy: 6.8, r: 1.25, 'stroke-width': 1.25 } },
    { tag: 'circle', tone: 'bloom', attrs: { cx: 3.3, cy: 6.8, r: 1.25, 'stroke-width': 1.25 } },
    { tag: 'circle', tone: 'bloom', attrs: { cx: 2.4, cy: 4.0, r: 1.25, 'stroke-width': 1.25 } },
    {
      tag: 'path',
      tone: 'fruit',
      attrs: {
        d: 'M11.3 8.2 C9.2 8.2 8.0 9.7 8.0 11.4 C8.0 13.4 9.5 14.6 11.3 14.6 C13.1 14.6 14.6 13.4 14.6 11.4 C14.6 9.7 13.4 8.2 11.3 8.2 Z',
        fill: 'currentColor',
        'fill-opacity': 0.22,
      },
    },
    { tag: 'path', tone: 'fruit', attrs: { d: 'M11.3 8.2 C11.3 7.0 12.0 6.1 13.0 5.7' } },
  ],

  // Sprouting seedling on soil line
  sow: [
    { tag: 'path', attrs: { d: 'M2.5 13.5 H13.5' } },
    { tag: 'path', attrs: { d: 'M8 13.5 V7.5' } },
    { tag: 'path', attrs: { d: 'M8 9.2 C5.6 9.2 4.2 7.6 4.2 5.4 C6.4 5.4 8 6.8 8 9.2 Z' } },
    { tag: 'path', attrs: { d: 'M8 7.8 C10.4 7.8 11.8 6.2 11.8 4.0 C9.6 4.0 8 5.4 8 7.8 Z' } },
  ],

  // Fits climate: encircled check
  fits: [
    { tag: 'circle', attrs: { cx: 8, cy: 8, r: 5.8 } },
    { tag: 'path', attrs: { d: 'M5.3 8.2 L7.2 10.1 L10.9 6.1' } },
  ],

  // Check locally: encircled attention mark
  check: [
    { tag: 'circle', attrs: { cx: 8, cy: 8, r: 5.8 } },
    { tag: 'path', attrs: { d: 'M8 5.1 V8.6' } },
    { tag: 'circle', attrs: { cx: 8, cy: 11.1, r: 0.85, fill: 'currentColor', stroke: 'none' } },
  ],

  // Climate risk: triangle alert
  risk: [
    { tag: 'path', attrs: { d: 'M8 2.4 L14.1 13.2 H1.9 Z' } },
    { tag: 'path', attrs: { d: 'M8 6.4 V9.5' } },
    { tag: 'circle', attrs: { cx: 8, cy: 11.6, r: 0.85, fill: 'currentColor', stroke: 'none' } },
  ],

  // Guild job — Food: harvest bowl + leaf (distinct from fruit drupe silhouette)
  'job-food': [
    { tag: 'path', attrs: { d: 'M2.4 8.2 H13.6 C13.2 11.6 11.0 13.6 8 13.6 C5.0 13.6 2.8 11.6 2.4 8.2 Z' } },
    { tag: 'path', attrs: { d: 'M5.6 13.6 H10.4' } },
    { tag: 'path', attrs: { d: 'M8.2 8.0 C8.2 5.4 10.0 3.6 12.6 3.4 C12.4 6.0 10.6 7.8 8.2 8.0 Z' } },
    { tag: 'path', attrs: { d: 'M6.4 8.0 C5.8 6.4 4.8 5.4 3.6 5.0' } },
  ],

  // Guild job — Soil builder: roots & nitrogen nodules below soil line
  'job-soil': [
    { tag: 'path', attrs: { d: 'M2.2 6.5 H13.8' } },
    { tag: 'path', attrs: { d: 'M8 6.5 V11.8 M8 9.2 L5.0 11.5 M8 9.2 L11.0 11.5' } },
    { tag: 'circle', attrs: { cx: 4.8, cy: 12.2, r: 1.1, fill: 'currentColor', stroke: 'none' } },
    { tag: 'circle', attrs: { cx: 11.2, cy: 12.2, r: 1.1, fill: 'currentColor', stroke: 'none' } },
    { tag: 'circle', attrs: { cx: 8, cy: 13.2, r: 1.1, fill: 'currentColor', stroke: 'none' } },
    { tag: 'path', attrs: { d: 'M8 6.5 V3.2 M6.2 4.6 L8 3.0 L9.8 4.6' } },
  ],

  // Guild job — Helpers / pollinators: bee silhouette
  'job-helpers': [
    { tag: 'ellipse', attrs: { cx: 8, cy: 9.2, rx: 2.3, ry: 3.4 } },
    { tag: 'path', attrs: { d: 'M5.8 8.2 C3.4 7.0 2.6 4.8 4.4 4.2 C5.8 3.7 7.0 5.5 7.2 6.6' } },
    { tag: 'path', attrs: { d: 'M10.2 8.2 C12.6 7.0 13.4 4.8 11.6 4.2 C10.2 3.7 9.0 5.5 8.8 6.6' } },
    { tag: 'path', attrs: { d: 'M6.8 5.8 L5.8 3.6 M9.2 5.8 L10.2 3.6' } },
  ],

  // Guild job — Mulch: three stacked organic leaf-litter strokes
  'job-mulch': [
    { tag: 'path', attrs: { d: 'M2.4 13.0 C5.2 12.1 10.8 12.1 13.6 13.0' } },
    { tag: 'path', attrs: { d: 'M3.0 9.6 C5.8 8.6 10.2 10.4 13.2 9.4' } },
    { tag: 'path', attrs: { d: 'M2.6 6.2 C5.4 7.1 10.4 5.3 13.4 6.2' } },
    { tag: 'path', attrs: { d: 'M5.2 4.0 L6.8 4.8 M10.2 3.8 L11.4 4.6' } },
  ],

  // Guild job — Groundcover: low mat of small spreading leaves along ground line
  'job-ground': [
    { tag: 'path', attrs: { d: 'M2.0 12.8 H14.0' } },
    { tag: 'path', attrs: { d: 'M3.0 12.6 C3.0 10.4 4.6 9.4 6.2 10.4 C6.2 11.6 5.0 12.6 3.0 12.6 Z' } },
    { tag: 'path', attrs: { d: 'M6.2 12.6 C6.5 9.8 9.5 9.8 9.8 12.6' } },
    { tag: 'path', attrs: { d: 'M13.0 12.6 C13.0 10.4 11.4 9.4 9.8 10.4 C9.8 11.6 11.0 12.6 13.0 12.6 Z' } },
    { tag: 'path', attrs: { d: 'M8.0 10.2 V8.0 M6.6 8.8 L8.0 7.6 L9.4 8.8' } },
  ],

  // Guild job — Shelter / windbreak: tree canopy shielding wind lines
  'job-shelter': [
    { tag: 'path', attrs: { d: 'M10.5 13.8 V4.2' } },
    { tag: 'path', attrs: { d: 'M10.5 3.0 C8.2 3.8 7.4 6.0 7.4 8.4 C7.4 10.2 8.7 11.2 10.5 11.2 C12.3 11.2 13.6 10.2 13.6 8.4 C13.6 6.0 12.8 3.8 10.5 3.0 Z' } },
    { tag: 'path', attrs: { d: 'M2.0 6.0 H5.4 M2.0 8.8 H4.6 M2.0 11.6 H5.4' } },
  ],
};

export function glyphToneClass(tone: GlyphPrimitive['tone']): string | undefined {
  if (tone === 'bloom') return 'glyph-tone-bloom';
  if (tone === 'fruit') return 'glyph-tone-fruit';
  return undefined;
}
