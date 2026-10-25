---
type: Reference
title: Triage Workflow
description: Use this workflow for bd bead grooming and readiness management. Use triage-issue instead when the user wants root-cause bug investigation.
resource: ../../docs/agents/triage-workflow.md
tags: [docs]
status: stable
generated: { by: claude-code/claude-opus-5-5, at: 2026-10-25T08:57:08Z }
sources:
  - id: triage-workflow-md
    resource: ../../docs/agents/triage-workflow.md
    title: docs/agents/triage-workflow.md
    digest: sha256:5b3b9852edd48340
    last_modified: 2026-07-08T06:31:38Z
---

# Summary

Source document: [docs/agents/triage-workflow.md](../../docs/agents/triage-workflow.md).

- Each triaged bead has one bd `type` (category) and exactly one readiness label (state).
- States: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human` (all `status=open`), `wontfix` (closed).
- `in_progress` means claimed, never a triage state.
- `ready-for-agent`/`ready-for-human` need a durable brief in `design` and a checklist in `acceptance`.
- Waiting beads get a "Triage Notes" block with specific, actionable questions.
- Rejected enhancements need a `decision` bead before closing.
