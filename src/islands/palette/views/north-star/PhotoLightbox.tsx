/** @jsxImportSource preact */
// Botanical Photo Lightbox (Wave 5 N8-N9):
// - Local-only photos capped at min(720px, 1.5x naturalWidth) to avoid blurry upscaling
// - Hides role switcher & prev/next when <= 1 photo exists (no dead controls)
// - Real CC BY-SA attribution with clickable source_page_url & licence link
// - Focus trap, Escape closes lightbox only (restoring focus to trigger), touch swipe, 44px close button
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { T } from '../../strings.ts';

export interface LightboxPhoto {
  role: string;
  url: string;
  credit: string | null;
  licence: string | null;
  sourcePageUrl: string | null;
}

export interface PhotoLightboxProps {
  items: readonly LightboxPhoto[];
  initialIdx?: number;
  taxonName: string;
  canonicalName: string;
  onClose: () => void;
  returnFocusTo?: HTMLElement | null;
}

export function safeHttpHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

export function licenceUrlFor(licence: string | null | undefined): string | null {
  if (!licence) return null;
  const norm = licence.trim().toLowerCase();
  if (norm.startsWith('cc0')) return 'https://creativecommons.org/publicdomain/zero/1.0/';
  const m = /^cc\s+(by(?:-[a-z]+)*)\s+(\d+\.\d+)$/.exec(norm);
  if (m) return `https://creativecommons.org/licenses/${m[1]}/${m[2]}/`;
  if (norm.includes('public domain') || norm === 'pd') return 'https://creativecommons.org/publicdomain/mark/1.0/';
  return null;
}

export function PhotoLightbox({
  items,
  initialIdx = 0,
  taxonName,
  canonicalName,
  onClose,
  returnFocusTo,
}: PhotoLightboxProps) {
  const [broken, setBroken] = useState<ReadonlySet<string>>(() => new Set());
  const validItems = useMemo(() => items.filter((it) => !broken.has(it.url)), [items, broken]);
  const [idx, setIdx] = useState(() => Math.max(0, Math.min(initialIdx, Math.max(0, items.length - 1))));
  const [naturalW, setNaturalW] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);

  const safeIdx = validItems.length > 0 ? Math.min(idx, validItems.length - 1) : 0;
  const active = validItems[safeIdx] ?? null;
  const multi = validItems.length > 1;

  useEffect(() => {
    setNaturalW(null);
    setZoomed(false);
  }, [active?.url]);

  const step = (delta: number) => {
    if (!multi) return;
    setIdx((cur) => (cur + delta + validItems.length) % validItems.length);
  };

  useLayoutEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
        return;
      }
      if (e.key === 'ArrowLeft' && multi) {
        e.preventDefault();
        step(-1);
        return;
      }
      if (e.key === 'ArrowRight' && multi) {
        e.preventDefault();
        step(1);
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = [...dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        )].filter((el) => el.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      if (returnFocusTo && returnFocusTo.isConnected) returnFocusTo.focus();
    };
  }, [multi, validItems.length, onClose, returnFocusTo]);

  const cappedPx = naturalW ? Math.min(720, Math.round(naturalW * 1.5)) : 720;
  const imgStyle = zoomed
    ? { maxWidth: `${cappedPx}px`, width: `${cappedPx}px` }
    : { maxWidth: `${cappedPx}px` };

  const sourceHref = safeHttpHref(active?.sourcePageUrl);
  const licHref = licenceUrlFor(active?.licence);
  const roleLabel = (role: string) => T(`ns.dossier.role.${role}`) || role;

  return (
    <div
      class="photo-lightbox-backdrop"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={dialogRef}
        class="photo-lightbox"
        role="dialog"
        aria-modal="true"
        aria-label={T('ns.lightbox.aria', { plant: taxonName })}
        onTouchStart={(e) => { touchStartX.current = e.touches[0]?.clientX ?? null; }}
        onTouchEnd={(e) => {
          const sx = touchStartX.current;
          touchStartX.current = null;
          if (sx == null || !multi) return;
          const dx = (e.changedTouches[0]?.clientX ?? sx) - sx;
          if (Math.abs(dx) >= 48) step(dx > 0 ? -1 : 1);
        }}
      >
        <header class="photo-lightbox-head">
          <div class="photo-lightbox-title-wrap">
            <strong class="photo-lightbox-title">{taxonName}</strong>
            <span class="photo-lightbox-bot">{canonicalName}</span>
          </div>
          <div class="photo-lightbox-head-acts">
            {active && naturalW != null && (
              <button
                type="button"
                class="photo-lightbox-btn"
                aria-pressed={zoomed ? 'true' : 'false'}
                onClick={() => setZoomed((z) => !z)}
              >
                {zoomed ? T('ns.lightbox.zoomFit') : T('ns.lightbox.zoomIn')}
              </button>
            )}
            <button
              ref={closeRef}
              type="button"
              class="photo-lightbox-close"
              aria-label={T('ns.close')}
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </header>

        <div class="photo-lightbox-stage" data-zoomed={zoomed ? 'true' : 'false'}>
          {multi && (
            <button
              type="button"
              class="photo-lightbox-nav is-prev"
              aria-label={T('ns.lightbox.prev')}
              onClick={() => step(-1)}
            >
              ‹
            </button>
          )}
          {active ? (
            <img
              class="photo-lightbox-img"
              src={active.url}
              alt={`${taxonName} (${roleLabel(active.role)})`}
              style={imgStyle}
              onLoad={(e) => {
                const nw = (e.currentTarget as HTMLImageElement).naturalWidth;
                if (nw > 0) setNaturalW(nw);
              }}
              onError={() => {
                setBroken((prev) => new Set([...prev, active.url]));
              }}
            />
          ) : (
            <p class="small muted">{T('ns.lightbox.unavailable')}</p>
          )}
          {multi && (
            <button
              type="button"
              class="photo-lightbox-nav is-next"
              aria-label={T('ns.lightbox.next')}
              onClick={() => step(1)}
            >
              ›
            </button>
          )}
        </div>

        <footer class="photo-lightbox-foot">
          {multi && (
            <div class="photo-lightbox-roles" role="group" aria-label={T('ns.lightbox.rolesAria')}>
              {validItems.map((it, i) => (
                <button
                  key={`${it.role}-${i}`}
                  type="button"
                  class="gallery-pill"
                  aria-pressed={i === safeIdx ? 'true' : 'false'}
                  onClick={() => setIdx(i)}
                >
                  {roleLabel(it.role)}
                </button>
              ))}
            </div>
          )}
          {active && (
            <div class="photo-lightbox-credit">
              <span>
                {active.credit
                  ? T('ns.dossier.photoCredit', { author: active.credit })
                  : T('ns.dossier.sourceCurated')}
              </span>
              {active.licence && (
                licHref
                  ? <a class="photo-lightbox-link" href={licHref} target="_blank" rel="noopener noreferrer">{active.licence}</a>
                  : <span>({active.licence})</span>
              )}
              {sourceHref && (
                <a class="photo-lightbox-link" href={sourceHref} target="_blank" rel="noopener noreferrer">
                  {T('ns.lightbox.sourceLink')} ↗
                </a>
              )}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
