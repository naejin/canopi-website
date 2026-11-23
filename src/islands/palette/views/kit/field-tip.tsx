/** @jsxImportSource preact */
// Accessible Field Studio tooltip (.field-tip): hover, focus, tap-to-toggle on touch,
// Escape-to-dismiss, and viewport clamping. Zero native title="..." attributes.
import { useEffect, useId, useRef, useState } from 'preact/hooks';

export interface FieldTipProps {
  /** Short accessible label for the trigger button (e.g., "Explain frost window"). */
  label: string;
  /** Tooltip body text shown on hover, focus, or tap. */
  text: string;
  /** Optional custom trigger glyph; defaults to "?". */
  glyph?: string;
}

export function FieldTip({ label, text, glyph = '?' }: FieldTipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);

  const position = () => {
    const tr = triggerRef.current;
    if (!tr || typeof window === 'undefined') return;
    const r = tr.getBoundingClientRect();
    const bw = bubbleRef.current?.offsetWidth ?? 260;
    const bh = bubbleRef.current?.offsetHeight ?? 64;
    const pad = 12;
    const left = Math.max(pad, Math.min(r.left + r.width / 2 - bw / 2, window.innerWidth - bw - pad));
    const above = r.top - bh - 8;
    const top = above >= pad ? above : Math.min(r.bottom + 8, window.innerHeight - bh - pad);
    setPos({ left, top });
  };

  useEffect(() => {
    if (!open) return;
    position();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onScroll = () => position();
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  return (
    <span class="ct-tip-wrap">
      <button
        ref={triggerRef}
        type="button"
        class="ct-tip-trigger"
        aria-label={label}
        aria-expanded={open ? 'true' : 'false'}
        aria-describedby={open ? id : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span aria-hidden="true">{glyph}</span>
      </button>
      {open && (
        <span
          ref={bubbleRef}
          id={id}
          role="tooltip"
          class="ct-tip-bubble"
          style={pos ? { left: `${pos.left}px`, top: `${pos.top}px` } : { left: '12px', top: '12px' }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
