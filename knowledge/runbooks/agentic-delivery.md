---
type: Runbook
title: Agentic delivery adapter
description: Commands and places for running multi-agent work on this site with the phased-agentic-delivery skill.
status: stable
tags: [process]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T08:59:33Z }
---

# Agentic delivery: canopi-website

## Places
- User's checkout: `/home/daylon/projects/canopi-website` — agents never commit, stage, stash or build there (a build wipes `public/vendor` for the running dev server, which owns port 4321).
- Integration worktree: `/home/daylon/projects/canopi-website-wt/integration`, branch `guides/integration` from `master`. Merged to `master` and pushed by the main agent only (push deploys production).
- Stream worktrees: `git -C /home/daylon/projects/canopi-website worktree add /home/daylon/projects/canopi-website-wt/<stream> -b guides/<stream> guides/integration`, then `ln -s /home/daylon/projects/canopi-website/node_modules /home/daylon/projects/canopi-website-wt/<stream>/node_modules`. Builds inside a worktree with symlinked node_modules can touch `node_modules/.vite`; harmless, restart dev if odd.
- Source notes (gitignored, book-derived): `/home/daylon/projects/canopi-website/.local/field-guides/`. Guide specs: `.local/field-guides/specs/`.
- Screenshots: `<worktree>/.local/shots/` (gitignored).

## Gates (run inside the worktree)
- Affected / quick: `npm test`.
- Full: `npm test && npm run build && node scripts/check-built-site.mjs`.
- Ownership: each stream's brief lists its files; the reviewer checks `git diff --name-only guides/integration...HEAD` against it.

## Real-environment check
- `npx astro preview --port 4400` from the worktree after a build (never 4321).
- Screenshots: `google-chrome --headless=new --window-size=<w>,<h> --screenshot=<file> http://localhost:4400/guides/<slug>/` at 390 and 1280 widths, light and dark (`?theme=` not supported: set `data-theme` via a wrapper page or `--force-dark-mode`).
- DOM checks: `google-chrome --headless=new --dump-dom <url>`.

## Tracker
- bd (beads). Main agent only writes: `bd create`, `bd update <id> --claim`, `bd close <id> --reason`. Labels `guides-step-<n>`.

## Plan
- Architecture: [Field Guides architecture](/decisions/field-guides-architecture.md). Decisions: [user decisions](/decisions/field-guides-user-decisions.md). Plan: [Field Guides plan](/project/field-guides-plan.md).

## Models
- Agents use type `canopi-worker` (file + shell tools), strongest model, default effort.
