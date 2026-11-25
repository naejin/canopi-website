/** @jsxImportSource preact */
// Shared botanical & status glyph wrapper for Preact islands (L5-kit-leaf compliant).
import {
  GLYPH_PRIMITIVES,
  GLYPH_STROKE_WIDTH,
  GLYPH_VIEWBOX,
  glyphToneClass,
  type GlyphName,
} from '../../../../lib/glyphs.ts';

export type { GlyphName };

export function Glyph({
  name,
  size = 16,
  class: className,
  label,
}: {
  name: GlyphName;
  size?: number;
  class?: string;
  label?: string;
}) {
  const primitives = GLYPH_PRIMITIVES[name];
  return (
    <svg
      class={className ? `glyph ${className}` : 'glyph'}
      width={size}
      height={size}
      viewBox={GLYPH_VIEWBOX}
      fill="none"
      stroke="currentColor"
      stroke-width={GLYPH_STROKE_WIDTH}
      stroke-linecap="round"
      stroke-linejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
    >
      {primitives.map((p, idx) => {
        const toneClass = glyphToneClass(p.tone);
        if (p.tag === 'circle') return <circle key={idx} class={toneClass} {...p.attrs} />;
        if (p.tag === 'ellipse') return <ellipse key={idx} class={toneClass} {...p.attrs} />;
        return <path key={idx} class={toneClass} {...p.attrs} />;
      })}
    </svg>
  );
}
