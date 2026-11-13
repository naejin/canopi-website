/** @jsxImportSource preact */
// F1a seam (commit 0; design check A2, A3): the Balance panel, the entry of the lazy role `balance`
// (scripts/built-modules.mjs ROLE_ENTRIES), loaded through views/lazy.tsx balancePanel (retryable).
// Stream 4 (bal2, chunk 2) fills it from core balance.ts balanceChecks; stream 1 (pal1, chunk 1) places
// balancePanel.View in Palette. Its styles are page-level (src/styles/consortium/balance.css), never a
// stylesheet on this chunk (A14). A stub until then: it shows nothing.
export function BalanceSlot() {
  return null;
}
