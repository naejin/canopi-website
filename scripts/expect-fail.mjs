// Expected-fail markers (E6 design check §5.6; skill "phased agentic delivery" step 5): a user path's
// test written before the code that makes it pass, marked in the code with its owner stream, so the
// suite stays green while it fails for its stated reason and turns red the moment it passes.
//
//   failing('E6-3 (K3 lazy Details): …', { owner: 'K3', reason: /role `details` has no chunk/ }, async (t) => { … });
//
// - passes while fn throws an error whose message matches `reason`;
// - fails "now passes: remove the marker (owner …)" when fn passes: the owner removes the marker (the
//   call becomes a plain test()) in the commit that makes it pass;
// - fails with the error itself, prefixed "fails for another reason", when the message does not match
//   (a harness error is not the stated reason).
// fn runs as the test body; do not open subtests in it (a failed subtest fails the parent, past the
// marker). The state travels with each branch: there is no shared list of expected failures.
//
//   node scripts/expect-fail.mjs           lists every marker (file, owner, title)
//   node scripts/expect-fail.mjs --zero    exits 1 while any marker is left (pre-push to master, CI on master)
import test from 'node:test';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export function failing(title, { owner, reason, timeout } = {}, fn) {
  if (typeof owner !== 'string' || !owner) throw new Error(`failing("${title}"): name the owner stream`);
  if (!(reason instanceof RegExp)) throw new Error(`failing("${title}"): reason must be a RegExp of the expected failure`);
  if (!title.includes(owner)) throw new Error(`failing("${title}"): the title names its owner ${owner}`);
  return test(title, timeout ? { timeout } : {}, async (t) => {
    let error = null;
    try { await fn(t); } catch (err) { error = err ?? new Error(String(err)); }
    if (!error) throw new Error(`now passes: remove the marker (owner ${owner}) from "${title}"`);
    const message = String(error?.message ?? error);
    if (!reason.test(message)) {
      const wrapped = new Error(`fails for another reason than the marker's ${reason} (owner ${owner}): ${message}`);
      wrapped.cause = error;
      throw wrapped;
    }
    t.diagnostic(`expected failure (owner ${owner}): ${message.split('\n')[0]}`);
  });
}

const SCRIPTS = fileURLToPath(new URL('.', import.meta.url));
const MARKER = /^\s*failing\(\s*'((?:\\'|[^'])+)'\s*,\s*\{[^}]*\bowner:\s*'([^']+)'/gm;

// Every marker in the test files under scripts/ ({ file, owner, title }), sorted by file.
export function markers(root = SCRIPTS) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'fixtures') continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (/\.test\.mjs$/.test(entry.name)) {
        for (const [, title, owner] of readFileSync(path, 'utf8').matchAll(MARKER)) out.push({ file: relative(root, path), owner, title: title.replace(/\\'/g, "'") });
      }
    }
  };
  walk(root);
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const list = markers();
  for (const m of list) console.log(`${m.file}\t${m.owner}\t${m.title}`);
  console.log(`${list.length} expected-fail marker(s)`);
  if (process.argv.includes('--zero') && list.length) {
    console.error('expected-fail markers are left: each owner removes its marker in the commit that makes the test pass; none may reach master');
    process.exit(1);
  }
}
