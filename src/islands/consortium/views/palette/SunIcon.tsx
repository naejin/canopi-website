/** @jsxImportSource preact */
// Verbatim port of sunIconSVG(level, size) from v14 palette-redesign-mockup.html (lines 3170-3176).
import type { Stratum } from '../../../../lib/consortium/index.ts';

const SUN_COLOR: Record<Stratum, string> = {
  emergent: 'var(--sun-full)',
  high: 'var(--sun-mostly)',
  medium: 'var(--sun-part)',
  low: 'var(--sun-shade)',
};

export function SunIcon({ tier, size = 20 }: { tier: Stratum; size?: number }) {
  const c = SUN_COLOR[tier];
  if (tier === 'emergent') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="5" fill={c} stroke="currentColor" stroke-width="1.5" />
        <path
          d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17.6 17.6l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        />
      </svg>
    );
  }
  if (tier === 'high') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="6" fill={c} stroke="currentColor" stroke-width="1.5" />
        <path d="M12 6a6 6 0 0 1 6 6h-6V6Z" fill="var(--surface)" opacity="0.78" />
        <path d="M12 2v2M4 12H2M6 6l-1.5-1.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
      </svg>
    );
  }
  if (tier === 'medium') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="7" fill="var(--surface)" stroke="currentColor" stroke-width="1.6" />
        <path d="M12 5a7 7 0 0 0 0 14V5Z" fill={c} />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="7" fill={c} opacity="0.28" stroke="currentColor" stroke-width="1.6" />
      <path d="M14.5 6.5A6 6 0 1 0 17.5 15a5 5 0 0 1-3-8.5Z" fill={c} />
    </svg>
  );
}
