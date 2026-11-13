// The owners file of a multi-stream step (scripts/plan/<step>-owners.json; runbook "agentic
// delivery"): path -> stream per chunk. One owner per path per chunk; a path may change hands between
// chunks. An optional top-level "shared" list names flat JSON files several streams change (the locale
// files): each listed stream adds keys only under its own "prefix" and changes or deletes only the
// existing keys its "edits" globs name; prefixes and edits never overlap within a chunk, and the merge
// agent joins the blocks.
// scripts/plan-owners.test.mjs runs the file checks on every scripts/plan/*-owners.json in npm test;
// the command line validates owners files or checks a stream's diff against its rows:
//
//   node scripts/plan/owners.mjs validate [--file <owners.json>]   (default: every *-owners.json)
//   node scripts/plan/owners.mjs check <chunk> <stream> <base> [--file scripts/plan/e6-owners.json]
//
// check exits 1 naming each changed path (git diff --name-only <base>...HEAD) the stream does not own
// in that chunk, and each key of a shared file it added, changed or deleted outside its prefix and edits. Patterns are repo-relative: '*' stays within a folder, '**' crosses folders.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const DEFAULT_FILE = fileURLToPath(new URL('./e6-owners.json', import.meta.url));
const PLAN_DIR = fileURLToPath(new URL('./', import.meta.url));
// Every owners file of the plan folder, sorted.
export const ownersFiles = () => readdirSync(PLAN_DIR).filter((f) => f.endsWith('-owners.json')).sort().map((f) => PLAN_DIR + f);

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
  for (const [k, sh] of (owners.shared ?? []).entries()) {
    const named = Object.entries(sh.streams ?? {});
    if (!Array.isArray(sh.files) || !sh.files.length || !named.length) { problems.push(`shared ${k}: needs files and streams`); continue; }
    for (const [n, spec] of named) {
      if (!earlier.has(n)) problems.push(`shared ${k}: no stream ${n}`);
      if (typeof spec.prefix !== 'string' || !spec.prefix.endsWith('.')) problems.push(`shared ${k} ${n}: prefix must end with '.'`);
      if (!Array.isArray(spec.edits)) problems.push(`shared ${k} ${n}: no edits list`);
    }
    owners.chunks.forEach((chunk, i) => {
      const inChunk = named.filter(([n]) => chunk.streams?.[n]);
      for (let a = 0; a < inChunk.length; a++) {
        for (let b = a + 1; b < inChunk.length; b++) {
          const [na, sa] = inChunk[a], [nb, sb] = inChunk[b];
          const ka = [`${sa.prefix}*`, ...(sa.edits ?? [])], kb = [`${sb.prefix}*`, ...(sb.edits ?? [])];
          for (const x of ka) for (const y of kb) if (overlaps(x, y)) problems.push(`chunk ${i}: shared keys ${x} (${na}) and ${y} (${nb}) overlap; one stream per key per chunk`);
        }
      }
      for (const [name, s] of Object.entries(chunk.streams ?? {})) {
        for (const f of s.files ?? []) for (const g of sh.files) if (overlaps(f, g)) problems.push(`chunk ${i}: ${f} (${name}) is also the shared ${g}; a shared file has no single owner`);
      }
    });
  }
  return problems;
}

// The changed paths a stream does not own in a chunk.
export function outside(owners, chunk, stream, paths) {
  const rows = owners.chunks[chunk]?.streams?.[stream];
  if (!rows) throw new Error(`no stream ${stream} in chunk ${chunk}`);
  const shared = (owners.shared ?? []).filter((sh) => sh.streams?.[stream]).flatMap((sh) => sh.files);
  return paths.filter((p) => ![...rows.files, ...shared].some((f) => matches(f, p)));
}

// The keys of a shared flat JSON file a stream added, changed or deleted outside its prefix and edits,
// as sentences (base and head: parsed objects; spec: the stream's { prefix, edits }).
export function keyProblems(spec, base, head) {
  const allowed = (key) => key.startsWith(spec.prefix) || spec.edits.some((g) => matches(g, key));
  const problems = [];
  for (const key of Object.keys(head)) {
    if (!(key in base)) { if (!allowed(key)) problems.push(`added ${key} outside ${spec.prefix}`); }
    else if (head[key] !== base[key] && !allowed(key)) problems.push(`changed ${key}, not in its edits`);
  }
  for (const key of Object.keys(base)) if (!(key in head) && !allowed(key)) problems.push(`deleted ${key}, not in its edits`);
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--file');
  const given = at >= 0 ? args.splice(at, 2)[1] : undefined;
  const file = given ?? DEFAULT_FILE;
  const [cmd, chunk, stream, base] = args;
  if (cmd === 'validate') {
    let bad = 0;
    for (const f of given ? [given] : ownersFiles()) {
      const problems = ownersProblems(readOwners(f));
      if (problems.length) { bad++; console.error(`${f}:\n${problems.map((p) => `  ${p}`).join('\n')}`); }
      else console.log(`${f}: ok`);
    }
    process.exit(bad ? 1 : 0);
  }
  if (cmd !== 'check' || chunk === undefined || !stream || !base) {
    console.error('usage: node scripts/plan/owners.mjs validate [--file <owners.json>]\n       node scripts/plan/owners.mjs check <chunk> <stream> <base> [--file <owners.json>]');
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
  const mergeBase = execFileSync('git', ['merge-base', base, 'HEAD'], { encoding: 'utf8' }).trim();
  const keysAt = (rev, path) => { try { return JSON.parse(execFileSync('git', ['show', `${rev}:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); } catch { return {}; } };
  const keyBad = [];
  for (const sh of owners.shared ?? []) {
    const spec = sh.streams?.[stream];
    if (!spec) continue;
    for (const p of changed.filter((c) => sh.files.some((f) => matches(f, c)))) {
      for (const m of keyProblems(spec, keysAt(mergeBase, p), keysAt('HEAD', p))) keyBad.push(`  ${p}: ${m}`);
    }
  }
  if (keyBad.length) {
    console.error(`${stream} (chunk ${chunk}) changed shared keys outside its prefix and edits; request them from the main agent:\n${keyBad.join('\n')}`);
    process.exit(1);
  }
  console.log(`${stream} (chunk ${chunk}): ${changed.length} changed path(s), all owned`);
}
