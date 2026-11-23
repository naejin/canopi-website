---
type: Runbook
title: Agentic delivery adapter
description: Commands, worktree rules, and handoff gates for running Coral + Antigravity multi-agent work on canopi-website.
tags: [process, coral]
status: stable
generated: { by: antigravity/gemini-3-pro, at: 2026-11-23T21:06:39Z }
verified:
  - { by: antigravity/gemini, at: 2026-11-23T14:27:46Z }
sources:
  - id: agents-md
    resource: ../../AGENTS.md
    title: AGENTS.md
    digest: sha256:fe6d888a975358e9
    last_modified: 2026-11-23T20:58:48Z
  - id: githooks-lib
    resource: ../../.githooks/lib.sh
    title: .githooks/lib.sh
    digest: sha256:f65bdfdd2055c69d
    last_modified: 2026-11-22T22:39:24Z
  - id: ci-yml
    resource: ../../.github/workflows/ci.yml
    title: .github/workflows/ci.yml
    digest: sha256:af2644ba6c84cc80
    last_modified: 2026-11-19T18:24:56Z
---

# Agentic delivery: canopi-website (Coral + Antigravity)

## Worktrees & Isolation

- **Main checkout:** `/home/daylon/projects/canopi-website` — agents never edit, stage, stash, commit, or run builds in the user's main checkout (port `4321` belongs to the user's dev server).
- **Worker worktrees:** Create an isolated worktree and branch from the agreed base (typically local `master`):
  ```bash
  git -C /home/daylon/projects/canopi-website worktree add -b <branch> /home/daylon/projects/canopi-website-wt/<name> <base-sha>
  ```
- **Dependencies:** Run `npm ci --no-audit --no-fund` inside the worktree (capped at 3 GB RAM via `systemd-run`). **Never symlink `node_modules`** across worktrees: shared `.astro` and `.vite` caches leak content between branches.
- **Git hooks:** `git config core.hooksPath .githooks` set once in the main checkout applies automatically to every worktree.
- **Worktree cleanup:** Before removing any worktree, verify it has no uncommitted changes (`git status --porcelain`) and its commits are merged or explicitly discarded.

## Gates (run inside the worktree, memory-capped)

Run heavy commands under `timeout 600 systemd-run --user --scope -q -p MemoryMax=3G -p MemorySwapMax=0`:

- **Code & policy checks:** `npm run check && npm test && npm run check:arch && npm run check:dup && npm run check:dead && node_modules/.bin/ast-grep scan && node scripts/expect-fail.mjs --zero`
- **Build & site checks:** `npm run build && node scripts/check-built-site.mjs`
- **Browser & accessibility checks:** `npm run test:browser:smoke && npm run test:axe` (or full `npm run test:browser`; remember `build:browser-test` points `.wrangler/deploy/config.json` at `dist-test/`, so always rebuild production before any `wrangler` preview/deploy).
- **5 Frontend Engineering Rules (UI Redesigns & Parity):**
  1. **Mechanical CSS Extraction, Never Hand-Translation:** Extract an approved mockup's `<style>` block verbatim and bind JSX to the exact mockup class names and anatomy.
  2. **Stylesheet Line-Count Budget:** Keep production CSS within `~1.15×` of the approved mockup CSS line count (`node scripts/visual-parity.mjs --css <path> --budget-max-lines <n>`).
  3. **Detach Legacy CSS in Commit 1:** Never layer new CSS on top of retiring legacy stylesheets; detach in Commit 1 and delete retired files once parity is approved.
  4. **Mandatory `fullPage: true` Stitched Composites + Computed-Style Diff:** Capture `fullPage: true` Desktop Light (`1440×900`), Desktop Dark (`1440×900`), and Mobile (`390×844`) screenshots + overflow/error/computed-style checks via `scripts/visual-parity.mjs` before sign-off.
  5. **2-Stage Redesign Workflow:** Achieve 1:1 Visual/UX parity and obtain Operator Chrome sign-off in Stage 1 before updating UI browser tests once in Stage 2.
- **OKF knowledge:** Set `export OKF_ACTOR=antigravity/<model>`, run `python3 .okf/okf.pyz impact`, update affected concepts, then run `python3 .okf/okf.pyz sync && python3 .okf/okf.pyz check` (must report 0 errors).

## Preview & Port Isolation

- Never bind port `4321`. Start `npx astro preview --port <port>` on a unique port per worker, stop it by PID before reporting, and restart after any rebuild (a running preview answers 500 for rebuilt pages).
- When running browser tests concurrently across worktrees, set distinct `CANOPI_BROWSER_PORT` bases (slots step by 8 ports).
- Screenshots and scratch notes go under `.local/` (gitignored) or Coral artifacts (`coral-agent artifact upload <file>`).

## Coordination & Merge Rules

- **Task tracking:** Coral board and tasks (`coral-board task`) own team coordination; Beads (`bd`) is retired.
- **Ownership & review:** Workers commit cleanly on their worktree branch and publish the exact commit SHA, branch name, worktree path, and gate results to the Orchestrator/Reviewer.
- **Baseline ownership:** Only the merge/coordinator step rewrites `scripts/quality/baselines/*.json` (`--write` or `CANOPI_AXE_WRITE=1`).
- **No direct `master` push:** Never push to `master`, push `deploy`, or merge without explicit Operator/Orchestrator approval. Production deploys only via `master` → CI `gate` → `deploy` ([CI, hooks and the deploy gate](/runbooks/ci-and-deploy-gate.md)).
