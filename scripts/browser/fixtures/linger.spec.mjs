// A test file whose process keeps a handle open after its test (failure row F10, "stalled after the
// s1 file"): with --test-force-exit the runner ends it anyway. Run by scripts/browser-tests.test.mjs.
import test from 'node:test';

test('passes, then leaves an interval running', () => { setInterval(() => {}, 1000); });
