// The deploy gate of .github/workflows/ci.yml (E3, design check A18, rows D4, D5, D11): the `deploy`
// job's script, run as written in the workflow against a fixture remote, moves the `deploy` branch
// fast-forward only; and the jobs it relies on keep the names and settings the ruleset and the
// concurrency rule need.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const workflow = yaml.load(readFileSync(join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8'));
const deployJob = workflow.jobs.deploy;
const script = deployJob.steps.find((s) => s.name === 'Move deploy to this commit (fast-forward only)')?.run;

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

// A bare remote with master A -> B, and X, a commit beside B (not a descendant of B).
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'ci-deploy-'));
  const remote = join(dir, 'origin.git'), work = join(dir, 'work');
  git(dir, 'init', '-q', '--bare', remote);
  git(dir, 'init', '-q', '-b', 'master', work);
  for (const [k, v] of [['user.email', 'ci@example.invalid'], ['user.name', 'ci'], ['commit.gpgsign', 'false']]) git(work, 'config', k, v);
  git(work, 'remote', 'add', 'origin', remote);
  git(work, 'commit', '-q', '--allow-empty', '-m', 'A');
  const A = git(work, 'rev-parse', 'HEAD');
  git(work, 'commit', '-q', '--allow-empty', '-m', 'B');
  const B = git(work, 'rev-parse', 'HEAD');
  git(work, 'checkout', '-q', '--detach', A);
  git(work, 'commit', '-q', '--allow-empty', '-m', 'X');
  const X = git(work, 'rev-parse', 'HEAD');
  git(work, 'checkout', '-q', 'master');
  git(work, 'push', '-q', 'origin', 'master');
  return { dir, remote, work, A, B, X };
}

function deploy(f, sha) {
  const r = spawnSync('bash', ['-e', '-c', script], { cwd: f.work, encoding: 'utf8', env: { ...process.env, GITHUB_SHA: sha } });
  let tip = null;
  try { tip = git(f.remote, 'rev-parse', '--verify', '-q', 'refs/heads/deploy'); } catch { /* absent */ }
  return { code: r.status, out: `${r.stdout}${r.stderr}`, tip };
}

test('the deploy step exists in ci.yml', () => {
  assert.equal(typeof script, 'string', 'ci.yml deploy job: the step "Move deploy to this commit (fast-forward only)"');
  assert.doesNotMatch(script, /--force|\s-f\s|\+[0-9a-f$]/, 'never a forced push');
});

test('deploy: created at the first green commit, then moved fast-forward; an older run leaves it (D4, D5)', (t) => {
  const f = fixture();
  t.after(() => rmSync(f.dir, { recursive: true, force: true }));
  let r = deploy(f, f.A);
  assert.equal(r.code, 0, r.out);
  assert.equal(r.tip, f.A, 'created at A');
  assert.match(r.out, /does not exist yet/);
  r = deploy(f, f.B);
  assert.equal(r.code, 0, r.out);
  assert.equal(r.tip, f.B, 'moved to B');
  r = deploy(f, f.A);
  assert.equal(r.code, 0, r.out);
  assert.equal(r.tip, f.B, "A's late run leaves deploy at B");
  assert.match(r.out, /already contains/);
});

test('deploy: a commit that does not descend from deploy fails, naming both, and deploy stays', (t) => {
  const f = fixture();
  t.after(() => rmSync(f.dir, { recursive: true, force: true }));
  assert.equal(deploy(f, f.B).code, 0);
  const r = deploy(f, f.X);
  assert.equal(r.code, 1, r.out);
  assert.equal(r.tip, f.B);
  assert.ok(r.out.includes(f.X) && r.out.includes(f.B), r.out);
  assert.match(r.out, /fast-forward only/);
});

test('deploy: an unreachable remote fails instead of creating anything', (t) => {
  const f = fixture();
  t.after(() => rmSync(f.dir, { recursive: true, force: true }));
  git(f.work, 'remote', 'set-url', 'origin', join(f.dir, 'missing.git'));
  const r = deploy(f, f.B);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /ls-remote failed/);
});

test('the gate, deploy and live jobs keep what the ruleset and concurrency rely on (D4, D11, D14)', () => {
  assert.equal(workflow.jobs.gate.name, 'gate', 'the ruleset on deploy requires the check named "gate"');
  assert.deepEqual([...workflow.jobs.gate.needs].sort(), ['browser', 'browser-build', 'changes', 'site', 'unit']);
  assert.equal(deployJob.needs, 'gate');
  assert.match(deployJob.if, /needs\.gate\.result == 'success'/);
  assert.match(deployJob.if, /github\.event_name == 'push' && github\.ref == 'refs\/heads\/master'/);
  assert.deepEqual(deployJob.concurrency, { group: 'deploy', 'cancel-in-progress': false });
  assert.deepEqual(deployJob.permissions, { contents: 'write' });
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.ok(!('pull_request_target' in workflow.on), 'no pull_request_target');
  for (const [id, job] of Object.entries(workflow.jobs)) {
    if (id !== 'deploy') assert.ok(!job.permissions, `${id}: no permissions beyond the read-only default`);
    assert.ok(job['timeout-minutes'] > 0, `${id}: timeout-minutes`);
  }
  assert.equal(workflow.jobs.live.needs, 'deploy');
});

test('the master zero-marker switch is warn or fail', () => {
  const mode = readFileSync(join(ROOT, '.githooks', 'zero-markers'), 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  assert.equal(mode.length, 1, '.githooks/zero-markers holds one setting line');
  assert.match(mode[0].trim(), /^(warn|fail)$/);
});
