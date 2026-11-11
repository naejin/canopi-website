/** @jsxImportSource preact */
// View slot of stream S2: the strata × phases matrix and every other S2 view. This module routes the
// view switch from store.view (matrix, phone grid and stepper, side view, Jobs, the plant list), so
// App.tsx needs no slot per view. Null until the stream fills it; App.tsx renders it once ready.
import type { ComponentType } from 'preact';

export const Matrix: ComponentType | null = null;
