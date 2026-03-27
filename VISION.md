# Tryllestavsprojekt Vision

## Purpose

Tryllestavsprojekt exists to create a magical city treasure hunt for kids, where physical NFC "magic spots" and a personal "magic wand" work together as one integrated experience.

## North Star

Deliver a dependable "find, tap, collect" loop where:

1. A child discovers a magic spot in the city.
2. The child activates the spot with their wand.
3. The spot writes a collectible entry to the wand ledger.
4. The child can scan the wand on the website to see progress and hints.

## Primary User Outcomes

1. Kids experience a playful, discoverable, and understandable treasure hunt.
2. Progress is stored on the wand itself so the hunt works offline and remains decentralized.
3. Kids can view collected and missing spots in a friendly web visualization with guidance.
4. Returning participants can keep prior years on the same wand while joining new hunts.

## Product Goals (Current Phase)

1. Integrated hunt loop: spot activation writes proof of discovery to the wand ledger.
2. Decentralized data model: no central server is required for core collection progress.
3. Website companion: wand scan shows collected spots, missing spots, and hunt hints.
4. Year-over-year continuity: new yearly hunts can coexist with previous years on one wand.
5. Open wand utility: record 1 remains free for normal everyday NFC use outside the hunt.
6. Website toybox: kids (or guardians) can configure record 1 for common NFC actions such as opening a link.

## Non-Goals (Current Phase)

1. Cloud-first architecture for core progression logic.
2. Always-online gameplay assumptions.
3. Advanced anti-cheat systems before baseline hunt reliability is proven.
4. Complex social features (accounts, friends, leaderboards) in initial releases.

## Design Principles

1. Kid-first clarity: interactions should feel magical but remain understandable.
2. Offline by default: wand data is the source of truth for progression.
3. Reliability before spectacle: writes, reads, and feedback must be dependable.
4. Preserve website and firmware responsibility boundaries.
5. Keep record 1 untouched by hunt internals to support general NFC behavior.

## Success Signals

1. A first-time child can collect at least one spot with minimal assistance.
2. Spot collection survives disconnected operation and can be visualized later on the website.
3. A wand used in year N can still be used in year N+1 without losing year N data.
4. Hunt writes do not overwrite record 1 user-defined content.

## Milestone Framing

1. Hunt foundations: define wand ledger format and spot write protocol.
2. Spot network: deploy test spots and verify collection reliability in real environments.
3. Companion web: visualize progress, missing spots, and contextual hints from wand data.
4. Seasonal continuity: support multi-year hunts with migration and compatibility rules.
5. Extended magic: preserve record 1 free-write behavior for everyday NFC actions.
6. Toybox UX: provide a simple record 1 configurator for common NFC actions.

## Scope Boundaries

1. `arduino/` owns spot behavior, spot identity, and write protocol execution.
2. `website/` owns wand scan UX, visualization, hint presentation, compatibility messaging, and record 1 toy configuration UI. Implemented as a Vue 3 Progressive Web App (PWA).
3. Shared contract includes wand ledger schema, yearly hunt identifiers, and record allocation rules.

## Resolved Architecture Decisions (v1.0)

1. Wand data keeps one hunt ledger record per year containing only a list of spot IDs.
2. External hunt metadata (spot names, map positions, hints) is resolved via `(year, spotId)` in the website.
3. Spot identity is year-scoped by design because each year has its own record.
4. Spot write behavior is idempotent append: add spot ID only if it is not already present in that year's list.
5. Target tag families are NTAG215 and NTAG216; data model must remain compact.
6. Year rollover is managed by yearly firmware/config updates on spots; website reads all present yearly records.
7. Hunt records may appear in any physical order on the tag and must be discovered by MIME type plus year metadata.
8. Record 1 stays reserved for user-controlled NFC actions and is not consumed by hunt internals.

## Data Contract Summary

1. Record 1: user toy/action record for common NFC behavior (for example URL launch).
2. Hunt records: one or more records keyed by MIME type and year marker, each containing spot ID list for that year.
3. Parsing rule: never rely on record index except preserving record 1 availability.
4. Lookup rule: website maps `(year, spotId)` to external static hunt content.

## Formal Ledger MIME Schema (Draft v1)

Hunt records use a MIME payload format with this media type:

`application/vnd.tryllestav.hunt+json`

Payload shape:

```json
{
  "year": 2026,
  "spots": ["s1", "s3", "s9"]
}
```

Schema rules:

1. `year` must be an integer in the expected hunt range.
2. `spots` must be a string array of unique spot IDs.
3. The same wand can contain multiple yearly hunt records.
4. Physical record order is not stable and cannot be used for discovery.
5. Discovery must use `(recordType=mime, mediaType, payload.year)`.
6. Spot writes are idempotent and must append only missing spot IDs for that year.

## Hunt Asset Delivery Model

### Overview

Hunt content (spot names, hints, images, branding) is delivered as **static JSON files bundled with the website build**. No backend server is required. This keeps the companion web fully offline-capable and allows non-technical hunt organizers to configure yearly hunts.

### Asset Structure

Each hunt year is a self-contained folder under `website/public/hunts/`:

```
hunts/
  2026/
    hunt.json       ← Year branding + spot metadata (edited by organizers)
    images/
      hunt-banner.jpg        ← Hunt branding image
      s1-garden.jpg          ← Spot images
      s2-tower.jpg
```

### hunt.json Schema

```json
{
  "year": 2026,
  "title": "The Dragon's Quest",
  "description": "Help the dragons find their lost treasures...",
  "image": "images/hunt-banner.jpg",
  "imageAlt": "Dragons flying over the city",
  "spots": {
    "s1": {
      "name": "The Dragon's Garden",
      "hint": "Look for the red door with a golden knocker.",
      "collectedText": "You found the magical garden! 🎭",
      "image": "images/s1-garden.jpg",
      "imageAlt": "Lush green garden with stone statues",
      "location": "Central Park, North Gate"
    }
  }
}
```

### Non-Technical Configurability Approach

1. **Asset editing**: Hunt organizers edit JSON and add image files with no coding required.
2. **Versioning**: Each year's hunt is a separate folder; copying and modifying the previous year is the upgrade path.
3. **Validation**: Simple JSON structure; non-technical users can validate with online JSON validators.
4. **Decoupling**: Hunt content is entirely separate from code; website rebuilds automatically recognize new hunts.

### Design Rationale

- **Static delivery** aligns with PWA offline-first design and zero-backend requirements.
- **Separate by year** mirrors the wand ledger's yearly hunt records.
- **(year, spotId) lookup** matches the wand data contract: website resolves spot metadata from JSON, wand holds only collected IDs.
- **Images bundled at build time** ensures fast load and offline availability.
- **Non-technical authorship** lowers barrier for yearly hunt creation and seasonal updates.

## Working Agreement

When adding or changing features:

1. State which user outcome is improved.
2. State which goal it supports.
3. Explain how offline/decentralized behavior is preserved.
4. Explain how record 1 freedom and unordered hunt record parsing remain safe.
5. Update schematics and agent guidance if the flow or architecture changes.
