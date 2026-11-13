// The owners file of a multi-stream step (scripts/plan/<step>-owners.json; runbook "agentic
// delivery"): path -> stream per chunk. One owner per path per chunk; a path may change hands between
// chunks. scripts/plan-owners.test.mjs runs the file checks in npm test; the command line checks a
// stream's diff against its rows:
//
//   node scripts/plan/owners.mjs check <chunk> <stream> <base> [--file scripts/plan/e6-owners.json]
//
// exits 1 naming each changed path (git diff --name-only <base>...HEAD) the stream does not own in
// that chunk. Patterns are repo-relative: '*' stays within a folder, '**' crosses folders.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const DEFAULT_FILE = fileURLToPath(new URL('./e6-owners.json', import.meta.url));

const isGlob = (p) => p.includes('*');
export function patternRegex(pattern) {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '*' && pattern[i + 1] === '*') { re += '.*'; i++; if (pattern[i + 1] === '/') i++; }
    else if (c === '*') re += '[^/]*';
    else re += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}
export const matches = (pattern, path) => (isGlob(pattern) ? patternRegex(pattern).test(path) : pattern === path);

// Whether two patterns can name one path. Two globs overlap when one's fixed prefix (before its first
// '*') starts the other's: conservative, so a false overlap is fixed by a narrower pattern.
export function overlaps(a, b) {
  if (!isGlob(a) && !isGlob(b)) return a === b;
  if (!isGlob(a)) return matches(b, a);
  if (!isGlob(b)) return matches(a, b);
  const pa = a.slice(0, a.indexOf('*')), pb = b.slice(0, b.indexOf('*'));
  return pa.startsWith(pb) || pb.startsWith(pa);
}

export const readOwners = (file = DEFAULT_FILE) => JSON.parse(readFileSync(file, 'utf8'));

// Problems of an owners file, as sentences (empty: none): chunks numbered 0, 1, 2… in order; each
// stream with files and needs; each need a stream of an earlier chunk; no path owned by two streams
// in one chunk; patterns repo-relative.
export function ownersProblems(owners) {
  const problems = [];
  const earlier = new Set();
  owners.chunks.forEach((chunk, i) => {
    if (chunk.chunk !== i) problems.push(`chunk ${i} is numbered ${chunk.chunk}`);
    const streams = Object.entries(chunk.streams ?? {});
    if (!streams.length) problems.push(`chunk ${i} has no stream`);
    for (const [name, s] of streams) {
      if (!Array.isArray(s.files) || !s.files.length) problems.push(`chunk ${i} ${name}: no files`);
      if (!Array.isArray(s.needs)) problems.push(`chunk ${i} ${name}: no needs list`);
      for (const n of s.needs ?? []) if (!earlier.has(n)) problems.push(`chunk ${i} ${name} needs ${n}, which no earlier chunk has`);
      for (const f of s.files ?? []) if (f.startsWith('/') || f.split('/').includes('..') || f.includes('\\')) problems.push(`chunk ${i} ${name}: ${f} is not repo-relative`);
      if (new Set(s.files).size !== s.files?.length) problems.push(`chunk ${i} ${name}: a path listed twice`);
    }
    for (let a = 0; a < streams.length; a++) {
      for (let b = a + 1; b < streams.length; b++) {
        for (const fa of streams[a][1].files ?? []) {
          for (const fb of streams[b][1].files ?? []) {
            if (overlaps(fa, fb)) problems.push(`chunk ${i}: ${fa} (${streams[a][0]}) and ${fb} (${streams[b][0]}) name the same path; one owner per path per chunk`);
          }
        }
      }
    }
    for (const [name] of streams) earlier.add(name);
  });
  return problems;
}

// The changed paths a stream does not own in a chunk.
export function outside(owners, chunk, stream, paths) {
  const rows = owners.chunks[chunk]?.streams?.[stream];
  if (!rows) throw new Error(`no stream ${stream} in chunk ${chunk}`);
  return paths.filter((p) => !rows.files.some((f) => matches(f, p)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--file');
  const file = at >= 0 ? args.splice(at, 2)[1] : DEFAULT_FILE;
  const [cmd, chunk, stream, base] = args;
  if (cmd !== 'check' || chunk === undefined || !stream || !base) {
    console.error('usage: node scripts/plan/owners.mjs check <chunk> <stream> <base> [--file <owners.json>]');
    process.exit(2);
  }
  const owners = readOwners(file);
  const problems = ownersProblems(owners);
  if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
  const changed = execFileSync('git', ['diff', '--name-only', `${base}...HEAD`], { encoding: 'utf8' }).split('\n').filter(Boolean);
  const bad = outside(owners, Number(chunk), stream, changed);
  if (bad.length) {
    console.error(`${stream} (chunk ${chunk}) changed paths it does not own; request them from the main agent:\n${bad.map((p) => `  ${p}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`${stream} (chunk ${chunk}): ${changed.length} changed path(s), all owned`);
}
