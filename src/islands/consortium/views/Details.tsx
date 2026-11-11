/** @jsxImportSource preact */
// View slot of stream S3: the plant dialog and every S3 sheet. This module routes store.sheet itself
// (details with the correction form, Swap, Add, Search, Paste, the toast), so App.tsx needs no slot
// per sheet. Null until the stream fills it; App.tsx renders it whenever it is set.
import type { ComponentType } from 'preact';

export const Details: ComponentType | null = null;
