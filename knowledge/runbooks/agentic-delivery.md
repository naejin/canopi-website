---
type: Runbook
title: Agentic delivery adapter
description: Commands and places for running multi-agent work on this site with the phased-agentic-delivery skill.
status: stable
tags: [process]
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-26T20:07:50Z }
---

# Agentic delivery: canopi-website

## Places
`<repo>` is the user's checkout and `<worktrees>` the sibling folder that holds the worktrees (`<repo>-wt`); the actual paths are in the main agent's brief.
- User's checkout: `<repo>` — agents never commit, stage, stash or build there (a build wipes `public/vendor` for the running dev server, which owns port 4321).
- Integration worktree: `<worktrees>/integration`, branch `guides/integration` from `master`. Merged to `master` and pushed by the main agent only (push deploys production).
- Stream worktrees: `git -C <repo> worktree add <worktrees>/<stream> -b guides/<stream> guides/integration`, then give the stream its own node_modules: `cp -al <worktrees>/integration/node_modules <worktrees>/<stream>/node_modules` and delete `node_modules/.astro` and `node_modules/.vite` in the copy. Never symlink node_modules: a shared one shares Astro's content cache, and other streams' guides leak into the build. The integration worktree has its own `npm ci` install; never use the user checkout's node_modules. Agents never run `npm i` in a stream: a dependency change is a hand-off.
- Source notes (gitignored, book-derived): `<repo>/.local/field-guides/`. Guide specs: `.local/field-guides/specs/`.
- Screenshots: `<worktree>/.local/shots/` (gitignored).

## Gates (run inside the worktree)
- Affected / quick: `npm test && npm run check`.
- Full: `npm test && npm run check && npm run build && node scripts/check-built-site.mjs`.
- Ownership: each stream's brief lists its files; the reviewer checks `git diff --name-only guides/integration...HEAD` against it.
- Merging streams: a conflict only in `knowledge/` source digest lines is resolved by taking either side, then `python3 .okf/okf.pyz sync` recomputes the digests.

## Real-environment check
- `npx astro preview --port <port>` from the worktree after a build (never 4321; each agent gets its own port and kills only its own pid, and stops its preview before it reports: a preview left running took another stream's port in step 4). Before removing worktrees the main agent kills any listener whose `readlink /proc/<pid>/cwd` is inside them (`ss -ltnp`). After a rebuild, restart preview: a running preview answers 500 for the rebuilt pages.
- Screenshots: `google-chrome --headless=new --window-size=<w>,<h> --screenshot=<file> http://localhost:<port>/guides/<slug>/` at 390 and 1280 widths, light and dark. The theme comes from `localStorage['canopi-theme']` (`light` or `dark`), so `--force-dark-mode` and `?theme=` do not switch it: drive Chrome over the DevTools protocol (`--remote-debugging-port`) and set the key with `Page.addScriptToEvaluateOnNewDocument` before navigating; `Page.captureScreenshot` with `captureBeyondViewport` takes the full page.
- DOM checks: `google-chrome --headless=new --dump-dom <url>`.

## Tracker
- bd (beads). Main agent only writes: `bd create`, `bd update <id> --claim`, `bd close <id> --reason`. Labels `guides-step-<n>`.

## Plan
- Architecture: [Field Guides architecture](/decisions/field-guides-architecture.md). Decisions: [user decisions](/decisions/field-guides-user-decisions.md). Plan: [Field Guides plan](/project/field-guides-plan.md).

## Models
- Agents use type `canopi-worker` (file + shell tools), strongest model, default effort.
