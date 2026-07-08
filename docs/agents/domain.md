# Domain Docs

Use this layout unless the repo already has a stronger domain-doc structure.

## Read Before Writing

- For a single-context repo: read root `CONTEXT.md` and root `docs/adr/`.
- For a multi-context repo: read root `CONTEXT-MAP.md`, the relevant context-local `CONTEXT.md`, and the relevant ADR directories.
- If the repo is itself a skill catalog, also read category READMEs before changing promoted entries.

## Preferred Layouts

### Single Context

- `CONTEXT.md` at the repo root.
- `docs/adr/` at the repo root.

### Multi Context

- `CONTEXT-MAP.md` at the repo root.
- One `CONTEXT.md` per mapped context.
- Root `docs/adr/` for system-wide decisions.
- Context-local `docs/adr/` for context-specific decisions.

## Write Rules

- Update the relevant `CONTEXT.md` only when a project-specific term or ambiguity is resolved.
- Create ADRs only for decisions that are hard to reverse, surprising without context, and the result of a real trade-off.
- Keep skill docs focused on agent behavior; do not add auxiliary READMEs inside individual skill folders.
- Use glossary terms in issue titles, bead briefs, PRDs, test plans, and architecture notes.
