---
description: "Use when creating, editing, or reviewing repository documentation."
applyTo: "**/*.md"
---

# Documentation conventions

Read [`AGENTS.md`](../../AGENTS.md), [`CONTEXT.md`](../../CONTEXT.md), and the smallest canonical reference that covers the change.

Keep one source of truth per concept:

- Put stable domain language in `CONTEXT.md`; keep it glossary-only.
- Put product, protocol, architecture, and content facts in `docs/reference/`.
- Put ordered procedures and troubleshooting in `docs/operations/`.
- Record only hard-to-reverse, surprising trade-offs with real alternatives in `docs/adr/`.
- Use links and concise pointers instead of repeating canonical facts.

When a document moves, repair every link to the old path. Before finishing, scan for deleted paths, stale terminology, and conflicting protocol values.
