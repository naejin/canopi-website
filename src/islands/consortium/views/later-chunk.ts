// The later chunk (views/later.ts: the views after the matrix, the print sheet, Share, FutureSlot and
// the .canopi writer), imported through one retryable loader (views/lazy.tsx), so every part of it
// shares one retry state: after a failed fetch, the next use by any part asks for the next
// ?retry=n, never a URL Chromium already remembers as failed (E6 hand-off review 1). Each part picks
// its export from the module this returns.
import { retryable } from './lazy.tsx';

export const laterChunk = retryable(() => import('./later.ts'), (m) => m);
