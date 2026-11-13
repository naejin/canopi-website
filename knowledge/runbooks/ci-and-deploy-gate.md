---
type: Runbook
title: CI, hooks and the deploy gate
description: How the website's tiered hooks, GitHub Actions CI and the deploy branch gate production deploys on Cloudflare Workers Builds, and what to do when something fails.
generated: { by: claude-code/claude-opus-5-5, at: 2026-11-13T12:13:44Z }
verified:
  - { by: claude-code/claude-opus-5-5, at: 2026-11-13T12:13:47Z }
sources:
  - id: ci-yml
    resource: ../../.github/workflows/ci.yml
    title: .github/workflows/ci.yml
    digest: sha256:f54c110957ab8614
    last_modified: 2026-11-13T12:11:05Z
  - id: nightly-yml
    resource: ../../.github/workflows/nightly.yml
    title: .github/workflows/nightly.yml
    digest: sha256:f461e1c971e04d97
    last_modified: 2026-11-13T03:21:28Z
  - id: lib-sh
    resource: ../../.githooks/lib.sh
    title: .githooks/lib.sh
    digest: sha256:cee592be6d4538a1
    last_modified: 2026-11-13T03:34:49Z
  - id: pre-commit
    resource: ../../.githooks/pre-commit
    title: .githooks/pre-commit
    digest: sha256:38aa2d7737c93c66
    last_modified: 2026-11-13T03:21:28Z
  - id: pre-push
    resource: ../../.githooks/pre-push
    title: .githooks/pre-push
    digest: sha256:02956cb778d95bb8
    last_modified: 2026-11-13T03:34:49Z
  - id: zero-markers
    resource: ../../.githooks/zero-markers
    title: .githooks/zero-markers
    digest: sha256:3127011e9fa251e0
    last_modified: 2026-11-13T03:34:49Z
  - id: version-json-ts
    resource: ../../src/pages/version.json.ts
    title: src/pages/version.json.ts
    digest: sha256:9774b792a9af6f35
    last_modified: 2026-11-13T03:21:28Z
  - id: ci-deploy-test-mjs
    resource: ../../scripts/ci-deploy.test.mjs
    title: scripts/ci-deploy.test.mjs
    digest: sha256:9b06ba6820941ce1
    last_modified: 2026-11-13T03:40:44Z
enforced_by: [.github/workflows/ci.yml, scripts/ci-deploy.test.mjs]
---

# CI, hooks and the deploy gate

Master deploys only through a green `gate` check. GitHub Actions moves the `deploy` branch, and Cloudflare Workers Builds builds `deploy` as its production branch. Step E3 of the [Consortium v2 plan](/project/consortium-v2-plan.md); owner answers in [the decisions](/decisions/consortium-user-decisions.md) ("Deploy gate answers", 2026-11-13).

## Tiers

| Tier | Where | What | Budget |
|---|---|---|---|
| pre-commit | `.githooks/pre-commit` | ast-grep (`sgconfig.yml`) on the staged script files; nothing until a rule exists; no format or lint step (the repo has none) | 10 s |
| pre-push | `.githooks/pre-push` | `npm run check`, `npm test`, `npm run check:arch`; skipped when every pushed range is documentation only; the zero-marker check when master is pushed (same `.githooks/zero-markers` switch) | 180 s |
| CI | `.github/workflows/ci.yml` | everything below, on each push to master or `ci-probe/**` and each pull request | each shard within 15 min |
| nightly | `.github/workflows/nightly.yml` | time to first view (desktop and phone, `--ratchet scripts/browser/timing.json`: warn above a value, fail above 1.5×; the file ships with null values, so the run only warns until the coordinator copies the first runner's `timing-json:` line after push B; values from runner runs only) and the `@real-data` browser tests | — |

- Hooks are enabled once in the main checkout: `git config core.hooksPath .githooks` (`npm run hooks:install` prints it). The relative path applies to every worktree. There is no `prepare` script, because Workers Builds' `npm ci` must not run git config.
- `.githooks/lib.sh`: `zero_markers` (the switch above), `capped` (systemd-run with 3 GB and no swap when it works, plain in CI), `step` (prints each command's time), `tier_done` (warns above the budget, fails above 1.5×), `docs_only` (the documentation-only rule, which ci.yml's `changes` job sources too).
- Bypass a hook once with `--no-verify`. CI still runs everything.

## CI jobs (`ci.yml`)

| Job | Runs | Notes |
|---|---|---|
| `changes` | always | `docs_only=true` when every changed path is `knowledge/**`, `.beads/**`, `docs/**` or a root `*.md` (never `src/data/*.md`). On master the base is the tip of `deploy` (the last commit tested green), not the previous push, so a documentation-only commit after a red code commit (or after a `--no-verify` push) still runs jobs 2–4. It is false when there is no base (no `deploy` yet, new branch, force push, manual run). Tested in `scripts/ci-deploy.test.mjs`. |
| 1 `unit` | always | climate install, `npm run check`, `npm test` (0 skips), `check:arch`, `check:dup`, `check:dead`, ast-grep, and the zero-marker check on master pushes (warns with the count while `.githooks/zero-markers` says `warn`; the batch's chunk-5 exit commit flips it to `fail`) |
| 2 `browser-build` | code ranges | `npm run build:browser-test`; artifact `browser-test-build`: `dist-test/` + `src/data/climate-index.json` (1 day), read by jobs 3 and 4 |
| 3 `browser` ×4 | code ranges | `npm run test:browser:shard -- N`; results artifact always |
| 4 `site` | code ranges; waits for job 2 (`needs: [changes, browser-build]`) | `npm run build` → `check-built-site` → `test:browser:smoke` → `test:axe` → `test:vectors` with `CANOPI_REQUIRE_VECTORS=1` → downloads job 2's `browser-test-build` artifact → the L11 graph test, `node --test scripts/built-modules.test.mjs` with `CANOPI_REQUIRE_BUILDS=1` (the test build's chunk graph is the production graph plus the test hook's chunk; a missing build fails) |
| `gate` | always | green when every job is green; jobs 2–4 may be skipped only when `docs_only` is true. **The ruleset requires this name: renaming it blocks every deploy.** |
| `deploy` | master push, gate green | `contents: write`; concurrency group `deploy`, never cancelled. If `deploy` already contains the sha, it exits 0. If the sha does not descend from `deploy`, it fails naming both. Otherwise `git push origin <sha>:refs/heads/deploy` (never `--force`). It creates `deploy` on the first run. |
| `live` | after deploy | polls `https://projectcanopi.com/version.json` every 30 s for up to 20 min. Green when the live site reports this sha or a newer one that contains it. Red otherwise, and GitHub emails the pusher. |

- **Climate cache:** `CANOPI_CLIMATE_CACHE=$RUNNER_TEMP/canopi-climate` (outside `node_modules`, which `npm ci` deletes). `actions/cache` key `canopi-climate-<sha256 of src/data/climate-release.json>`. Only job 1 saves it, right after `install:climate`. Jobs 2 and 4 and nightly only restore it.
- **Concurrency:** each master run has its own group and finishes. Other refs cancel superseded runs. `deploy` has its own group with `cancel-in-progress: false`, so a running deploy job is never cancelled. GitHub keeps one pending job per concurrency group: with three quick green pushes, the middle push's deploy job, still waiting, is cancelled when the third queues. That is the right outcome, since the newer deploy contains it; that run shows "cancelled", not red (D4: `deploy` ends at the latest green push).
- **Permissions:** `contents: read` everywhere except `deploy`. `persist-credentials: false` everywhere except `deploy`. Fork pull requests run jobs 1–4 with a read token. They never deploy, and there is no `pull_request_target`.
- **Node:** `.node-version` (22.22.0) is read by `actions/setup-node` and by Workers Builds. `/version.json` reports the Node version Cloudflare actually built with.
- `WRANGLER_SEND_METRICS=false`. Chrome comes from the runner image (`CANOPI_CHROME=/usr/bin/google-chrome`).

## Version marker

`src/pages/version.json.ts` is prerendered (in workerd) and writes `{ sha, built_at, node }`:
- `scripts/check-built-site.mjs` asserts a 40-hex `sha` when `GITHUB_SHA` (or `WORKERS_CI_COMMIT_SHA`) is set, and accepts `null` otherwise.
- `sha`: `WORKERS_CI_COMMIT_SHA`, else `GITHUB_SHA`, else `.git/HEAD` (a detached sha, or the loose ref of master or deploy), else `null`.
- `node`: taken from `npm_config_user_agent`, else `null`.
- Anything that is not a 40-hex sha or a plain version becomes `null`.

`public/_headers` serves it with `Cache-Control: no-store`. It holds a public commit id of a public repo and no personal data. A build in a worktree or from a tarball still works and writes `sha: null`.

## The `deploy` ruleset (coordinator creates it with `gh`; owner answer 1)

- Target: branch `deploy`. Rules: block force pushes, restrict deletions, require status check `gate` (source GitHub Actions) for every push.
- No bypass actor (owner answer 3). Agents push with the owner's credentials, so a bypass for the owner would also be a bypass for agents.

## Owner steps: Cloudflare production branch, on a phone

**Order:**
1. **Push A** lands on master: commit 0, E3, E5a and E4's first chunk. Workers Builds still deploys master as today, and CI runs.
2. CI is green and its `deploy` job has created `deploy` at push A's commit. The coordinator confirms that `deploy` = master = the sha in `https://projectcanopi.com/version.json` (the `live` job is green).
3. **Only then**, the owner switches the production branch to `deploy` and turns previews off (steps below) and replies "done". Until then nothing breaks: master keeps deploying ungated.
4. The coordinator runs probe P-E3a: an empty commit on master. `wrangler deployments list` should show a new deployment only once `deploy` moves, and `version.json` should show the sha.
5. **Push B** (E6 and E4's flips) goes through the gate. The switch must happen before push B, and in any case before the F1a push.

**Steps** (dashboard in the phone's browser; there is no app for Workers; labels may differ slightly):
1. Open `dash.cloudflare.com` and log in.
2. Tap the menu (☰), then **Compute (Workers)** → **Workers & Pages**.
3. Tap **projectcanopi**.
4. Tap the **Settings** tab and scroll to **Build**.
5. In **Branch control**, tap the edit (pencil) icon.
6. **Production branch:** replace `master` with `deploy`.
7. **Builds for non-production branches:** switch **off**.
8. Leave the build command, deploy command and root directory as they are. Tap **Save**.
9. Reply "done". Nothing else changes on the live site.

## When something goes wrong

| Case | What happens | What to do |
|---|---|---|
| CI red on master (D1) | `deploy` does not move; the live site stays | fix forward; the next green master commit moves `deploy` past it |
| `live` red: Cloudflare build failed after green CI (D6) | live site unchanged | projectcanopi → **Deployments** (or **Builds**) → the failed build → **Retry build**, or push an empty commit to master |
| Production broken after a deploy (D7) | — | projectcanopi → **Deployments** → **⋯** of the last good version → **Rollback**, or `wrangler rollback <version>`; then fix forward on master (rollback restoring assets is checked once by P-E3e) |
| GitHub Actions outage (D12) | no deploys | Cloudflare rollback if needed; never push `deploy` by hand (the ruleset refuses it anyway) |
| `deploy` job: "does not descend from deploy" | `deploy` unchanged | find why master and `deploy` diverged (a force push on master?); never force-push `deploy` |
| A commit weakens `ci.yml` (D13) | the new workflow gates itself | caught by reviews (ADR-3) |
