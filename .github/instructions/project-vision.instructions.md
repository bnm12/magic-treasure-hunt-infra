---
description: "Use when planning, implementing, or reviewing changes in Tryllestavsprojekt."
applyTo: "**"
---

# Project Vision Alignment

Before making meaningful changes, check `VISION.md` and `docs/schematics.md`.

## Required alignment checks

1. Connect proposed work to at least one primary user outcome in `VISION.md`.
2. Confirm whether the change belongs to `website/`, `arduino/`, or both, and keep responsibilities clear.
3. Preserve the baseline treasure-hunt loop (find spot, tap wand, collect, scan wand, get hints).
4. Preserve offline and decentralized behavior where wand data is the core source of truth.
5. Keep wand record 1 free for user-controlled NFC actions unless explicitly approved otherwise.
6. Prefer reliability and clarity over adding speculative features.
7. Preserve the v1.0 data model: one hunt record per year with only spot IDs, plus external `(year, spotId)` lookup in the website.
8. Never rely on hunt record index order; discover hunt records by MIME type and year metadata.
9. Preserve storage compactness assumptions for target tags: design within an approximately 888-byte total writable budget.
10. Keep hunt payloads strictly compact: media type carries year (`application/vnd.tryllestav.hunt.year-<YYYY>`) and payload stays exactly 8 bytes (64-bit mask).
11. Avoid introducing legacy on-tag compatibility branches unless there is real migrated production data that requires it.

## Documentation updates

When architecture, flows, scope, or milestones change:

1. Update `VISION.md` if goals, non-goals, or principles changed.
2. Update `docs/schematics.md` if diagrams or boundaries changed.
3. Update `AGENTS.md` in the same change to reflect structural or conceptual updates.

## Delivery expectations

1. Favor small, verifiable increments.
2. Include clear status and failure messaging in NFC user flows.
3. Keep setup assumptions explicit in docs when hardware or browser constraints apply.
4. Keep writes idempotent for spots: append spot ID only when missing from that year's list.
5. Maintain a website "toybox" path for configuring record 1 with common NFC actions.
6. Prefer byte-budget-conscious data contracts and call out expected on-tag byte cost in design changes.
