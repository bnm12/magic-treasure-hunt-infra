---
description: "Use when planning, implementing, or reviewing changes in Tryllestavsprojekt."
applyTo: "**"
---

# Project Vision Alignment

Before making meaningful changes, read the relevant documentation in this order to ensure you have a complete understanding of the system's design constraints:

- **Project scope and current state:** [`docs/01-PROJECT-OVERVIEW.md`](../../docs/01-PROJECT-OVERVIEW.md)
- **Product vision & design principles:** [`docs/02-VISION-AND-PURPOSE.md`](../../docs/02-VISION-AND-PURPOSE.md)
- **On-tag data model:** [`docs/03-TECHNICAL-PROTOCOL.md`](../../docs/03-TECHNICAL-PROTOCOL.md)
- **System architecture & flows:** [`docs/04-SYSTEM-ARCHITECTURE.md`](../../docs/04-SYSTEM-ARCHITECTURE.md)
- **Build, deploy, and operations:** [`docs/05-BUILD-AND-DEPLOY.md`](../../docs/05-BUILD-AND-DEPLOY.md)
- **How to keep docs in sync:** [`docs/MAINTENANCE.md`](../../docs/MAINTENANCE.md)
- **Repository-level responsibilities:** [`AGENTS.md`](../../AGENTS.md)

## Required Alignment Checks

Before implementing a feature, ensure it meets these criteria to avoid scope creep or architectural regression:

1. **Connect to a user outcome** in the **Primary User Outcomes** section of [`docs/02-VISION-AND-PURPOSE.md`](../../docs/02-VISION-AND-PURPOSE.md) to ensure we are only building features that benefit children or organizers directly.

2. **Confirm scope**: Does this belong to `website/`, `arduino/`, or both? Check the **Responsibility Boundaries** section in [`docs/04-SYSTEM-ARCHITECTURE.md`](../../docs/04-SYSTEM-ARCHITECTURE.md) to maintain clear separation of responsibilities.

3. **Preserve core loop**: The baseline hunt loop must remain intact so that the children's experience remains intuitive and engaging:
   - Find spot → Tap wand → Collect → Scan website → View progress

4. **Maintain offline/decentralized behavior**:
   - Wand data is source of truth because we want children to be able to use the wands with zero network coverage.
   - No central server required for core loop to prevent single points of failure.
   - Works during connectivity blips so that the treasure hunt never stalls in the forest or park.

5. **Protect record 1**:
   - Wand record 1 stays free for user-controlled NFC actions to ensure children can use their wands with other NFC tools.
   - Hunt logic never writes to record 1 to avoid overwriting user personal data.

6. **Respect data model**:
   - One hunt record per year (`x-hunt:<YYYY>`) to ensure the tag storage remains compact.
   - 8-byte payload (64-bit spot mask only) to guarantee the write takes less than a second.
   - Year in MIME type, not payload, to prevent redundant data overhead.
   - See [`docs/03-TECHNICAL-PROTOCOL.md`](../../docs/03-TECHNICAL-PROTOCOL.md) for exact format guidelines.

7. **Never rely on record order**:
   - Discover hunt records by MIME type + year because record ordering can be changed by third-party NFC writing software.
   - Physical record position is not stable, so we avoid hardcoding indices.
   - Skip record 1 by checking the record type, not position, to prevent reading metadata as a hunt.

8. **Preserve storage budget**:
   - Total writable space: Keep within `888` bytes per tag to avoid writing past the capacity of standard `NTAG215`/`NTAG216` tags.
   - Hunt records: Keep around `18`–`22` bytes each (per year) to ensure space for multi-year compatibility.
   - Metadata record: Keep around `20`–`40` bytes to preserve space.
   - Design within these constraints so that tags never run out of memory.

9. **Avoid legacy compatibility branches**:
   - Single strict format until production data exists to avoid bloated and fragile parsing code in the MVP phase.
   - No dual-read paths for old/new formats in `v1.0` to prevent unnecessary testing overhead.
   - If format must change, update protocol doc and add evolution rule to maintain a single source of truth.

10. **Prefer reliability & clarity**:
    - Reliability over speculative features to prevent failure during live field events.
    - Small, verifiable increments to ensure ease of testing.
    - Clear status and failure messaging in NFC flows so that children and organizers understand what is happening at any time.

11. **Confirm contributor impact**:
    - If setup, commands, wiring, or deployment flow changes, update [`docs/05-BUILD-AND-DEPLOY.md`](../../docs/05-BUILD-AND-DEPLOY.md) so that team members can bootstrap without confusion.
    - If repository structure or ownership boundaries change, update [`AGENTS.md`](../../AGENTS.md) to ensure roles remain completely accurate.

## Documentation Updates

When your change affects the system:

1. **Update the source-of-truth doc first** (see the **When to Update Docs** section in [`docs/MAINTENANCE.md`](../../docs/MAINTENANCE.md) for mapping) to ensure that code and documentation never drift.
2. **Update cross-references** so links and references remain accurate across all files.
3. **Update `.github/instructions/` files** if contributor workflow or conventions changed to prevent other developers from following outdated guidelines.
4. **Update `AGENTS.md`** if repository structure or ownership boundaries changed to keep the agent high-level overview correct.
5. **Follow the maintenance checklist** in the **Doc Maintenance Checklist** section of [`docs/MAINTENANCE.md`](../../docs/MAINTENANCE.md) to guarantee completeness.

## Scope Guardrails

- Keep architecture and protocol strict until production migration needs are proven, to avoid premature optimization.
- Prefer references over duplication between docs to maintain a single source of truth.
- Keep record 1 ownership and offline-first behavior non-negotiable to respect the project's foundational goals.
- Avoid speculative complexity before reliability is validated in field tests to reduce developmental overhead.

## Before Committing

- [ ] Alignment checks above are satisfied to ensure vision consistency.
- [ ] Relevant docs have been updated in the same commit to keep documentation accurate.
- [ ] No doc duplication exists (use references instead) to avoid maintenance conflict.
- [ ] Examples and diagrams still match code to prevent misleading instructions.
- [ ] No breaking changes exist without a note in the protocol doc to maintain backward compatibility.
