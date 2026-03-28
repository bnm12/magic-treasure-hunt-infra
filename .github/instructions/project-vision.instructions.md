---
description: "Use when planning, implementing, or reviewing changes in Tryllestavsprojekt."
applyTo: "**"
---

# Project Vision Alignment

Before making meaningful changes, read the relevant documentation in this order:

- **Project scope and current state:** [`docs/01-PROJECT-OVERVIEW.md`](../../docs/01-PROJECT-OVERVIEW.md)
- **Product vision & design principles:** [`docs/02-VISION-AND-PURPOSE.md`](../../docs/02-VISION-AND-PURPOSE.md)
- **On-tag data model:** [`docs/03-TECHNICAL-PROTOCOL.md`](../../docs/03-TECHNICAL-PROTOCOL.md)
- **System architecture & flows:** [`docs/04-SYSTEM-ARCHITECTURE.md`](../../docs/04-SYSTEM-ARCHITECTURE.md)
- **Build, deploy, and operations:** [`docs/05-BUILD-AND-DEPLOY.md`](../../docs/05-BUILD-AND-DEPLOY.md)
- **How to keep docs in sync:** [`docs/MAINTENANCE.md`](../../docs/MAINTENANCE.md)
- **Repository-level responsibilities:** [`AGENTS.md`](../../AGENTS.md)

## Required Alignment Checks

Before implementing a feature, ensure it meets these criteria:

1. **Connect to a user outcome** in the **Primary User Outcomes** section of [`docs/02-VISION-AND-PURPOSE.md`](../../docs/02-VISION-AND-PURPOSE.md).

2. **Confirm scope:** Does this belong to `website/`, `arduino/`, or both? Check the **Responsibility Boundaries** section in [`docs/04-SYSTEM-ARCHITECTURE.md`](../../docs/04-SYSTEM-ARCHITECTURE.md).

3. **Preserve core loop:** The baseline hunt loop must remain intact:
   - Find spot → Tap wand → Collect → Scan website → View progress

4. **Maintain offline/decentralized behavior**
   - Wand data is source of truth
   - No central server required for core loop
   - Works during connectivity blips

5. **Protect record 1**
   - Wand record 1 stays free for user-controlled NFC actions
   - Hunt logic never writes to record 1

6. **Respect data model**
   - One hunt record per year (`x-hunt:<YYYY>`)
   - 8-byte payload (64-bit spot mask only)
   - Year in MIME type, not payload
   - See [`docs/03-TECHNICAL-PROTOCOL.md`](../../docs/03-TECHNICAL-PROTOCOL.md) for exact format

7. **Never rely on record order**
   - Discover hunt records by MIME type + year
   - Physical record position is not stable
   - Skip record 1 by record type, not position

8. **Preserve storage budget**
   - Total writable space: ~888 bytes per tag
   - Hunt records: ~18–22 bytes each (per year)
   - Metadata record: ~20–40 bytes
   - Design within these constraints

9. **Avoid legacy compatibility branches**
   - Single strict format until production data exists
   - No dual-read paths for old/new formats in v1.0
   - If format must change, update protocol doc and add evolution rule

10. **Prefer reliability & clarity**
    - Reliability over speculative features
    - Small, verifiable increments
    - Clear status and failure messaging in NFC flows

11. **Confirm contributor impact**

- If setup, commands, wiring, or deployment flow changes, update [`docs/05-BUILD-AND-DEPLOY.md`](../../docs/05-BUILD-AND-DEPLOY.md)
- If repository structure or ownership boundaries change, update [`AGENTS.md`](../../AGENTS.md)

## Documentation Updates

When your change affects the system:

1. **Update the source-of-truth doc first** (see the **When to Update Docs** section in [`docs/MAINTENANCE.md`](../../docs/MAINTENANCE.md) for mapping)
2. **Update cross-references** so links and references remain accurate
3. **Update `.github/instructions/` files** if contributor workflow or conventions changed
4. **Update `AGENTS.md`** if repository structure or ownership boundaries changed
5. **Follow the maintenance checklist** in the **Doc Maintenance Checklist** section of [`docs/MAINTENANCE.md`](../../docs/MAINTENANCE.md)

## Scope Guardrails

- Keep architecture and protocol strict until production migration needs are proven.
- Prefer references over duplication between docs.
- Keep record 1 ownership and offline-first behavior non-negotiable.
- Avoid speculative complexity before reliability is validated in field tests.

## Before Committing

- [ ] Alignment checks above are satisfied
- [ ] Relevant docs have been updated in the same commit
- [ ] No doc duplication (use references instead)
- [ ] Examples and diagrams still match code
- [ ] No breaking changes without note in protocol doc
