# Tryllestavsprojekt: Project Overview

## What We're Building

**Tryllestavsprojekt** is a decentralized, offline-first treasure hunt experience for children. Kids use hand-crafted wooden **wands** (each containing a passive NFC tag) to collect spots placed around a city or event venue. All collected data lives on the wand itself — no server required.

### Core Loop

1. Child discovers a magic spot (physical plaque with NFC reader)
2. Child taps wand against the spot reader
3. Reader writes proof of collection to the wand
4. Child scans wand on website to see progress and collect hints
5. Year after year, the same wand accumulates more hunts

---

## Repository Structure

```
.
├── docs/                          ← Project documentation
├── website/                       ← Vue 3 PWA (hunt visualization, wand scanning, record 1 config)
├── arduino/                       ← Firmware for spot NFC writers (PN532 + RC522 variants)
├── .github/
│   ├── instructions/              ← Agent instructions and conventions
│   └── DOCUMENTATION-STRUCTURE.md ← Doc organization and maintenance rules
├── VISION.md                      ← Product vision (link to docs/02-VISION-AND-PURPOSE.md)
├── AGENTS.md                      ← Repository architecture and component roles
└── README.md                      ← Quick start (optional: can be created)
```

### Main Folders

#### `website/` (Vue 3 Progressive Web App)

**Responsibility:** Wand scanning UX, hunt progress visualization, record 1 toy configuration.

Key files:
- `src/App.vue` — Root component; wand scan entry point
- `src/components/PageLayout.vue` — Unified page shell (NFC banner, toast, hero, content container)
- `src/composables/useNfc.ts` — All Web NFC logic (scan, MIME hunt parsing, bitmask decode/encode)
- `src/components/HuntView.vue` — Single year hunt rendering
- `src/components/SpotCard.vue` — Individual spot visualization
- `src/components/ToyboxPanel.vue` — Record 1 configuration UI with multi-action presets
- `src/utils/spotLoader.ts` — Hunt asset loading and caching
- `public/hunts/` — Hunt JSON + images (edited by non-technical organizers)

Tech stack:
- **Framework:** Vue 3 with TypeScript
- **Localization:** vue-i18n@9
- **Build tool:** Vite
- **PWA:** Manual manifest + service worker (no vite-plugin-pwa due to Vite version compatibility)
- **NFC:** Browser Web NFC API (Chrome 108+, Edge, Samsung Internet)

#### `arduino/` (TML Firmware)

**Responsibility:** Spot NFC writer logic, wand ledger writes, metadata verification.

Key files:
- `NFC_Basic/NFC_Basic.ino` — PN532 (I2C) spot writer for NTAG21x tags
- `RC522_Basic/RC522_Basic.ino` — RC522 (SPI) variant (for MIFARE sticker tags; not recommended for wand glass ampules)
- `README.md` — Arduino setup, wiring, library dependencies

Main features:
- Scans NTAG21x tags (wands)
- Verifies wand metadata record (`x-hunt-meta`)
- Writes yearly hunt MIME records (`x-hunt:<YYYY>`) with 8-byte spot ID bitmasks
- Keeps record 1 (user NFC actions) untouched
- Serial console for dynamic spotId and huntYear configuration

#### `docs/` (This and Related Engineering Docs)

Purpose: Align all contributors on vision, technical protocol, architecture, and build procedures.

Core documents:
- `01-PROJECT-OVERVIEW.md` ← You are here
- `02-VISION-AND-PURPOSE.md` — Product goals, user outcomes, design principles
- `03-TECHNICAL-PROTOCOL.md` — Data model, on-tag schema, MIME types, bitmask format
- `04-SYSTEM-ARCHITECTURE.md` — Schematics, flows, responsibility boundaries
- `05-BUILD-AND-DEPLOY.md` — Full build and deployment guide
- `MAINTENANCE.md` — Rules for keeping docs in sync

---

## Current State (2026-03-28)

### Completed
- ✅ **Hunt asset system:** JSON + images per year; website auto-discovers; organizers don't code
- ✅ **Unified layout:** All pages share a canonical 680px max-width shell with consistent entry animations
- ✅ **Multi-entry architecture:** Main app and Management app have dedicated entry points for better bundle isolation
- ✅ **Web NFC and wand scanning:** Vue app scans wands, displays collected/missing spots, shows hints
- ✅ **Spot writers:** PN532 and RC522 firmware skethces that verify metadata and write yearly hunt records
- ✅ **Record 1 reserved:** User NFC action stays separate from hunt data; Toybox configures links, text, contact cards, and other common actions
- ✅ **Wand metadata record:** Authentication via `x-hunt-meta` MIME record (creation year + owner name)
- ✅ **Compact data model:** Yearly hunt records store only 64-bit spot mask; year in MIME type

### In Progress / Planning
- 🚧 **Field testing:** PN532 I2C reliability with glass ampule tags at real spots
- 🚧 **Wand form factor:** Wooden wand design with integrated tip cavity for NTAG216 tag (pending ferrite rod testing)
- 🚧 **Spot network:** Prototype deployment of 5–10 spots in a real venue
- 🚧 **Year-over-year continuity:** Multi-year hunt support (code ready; awaiting field validation)

### Component Roles and States

| Component | Owner | Status | Notes |
|-----------|-------|--------|-------|
| Hunt branding & spots (JSON) | Non-technical organizers | ✅ Ready | Edit hunt.json + add images, no coding |
| Website PWA | Frontend team | ✅ Functional | Vue 3 + Vite; Web NFC compatible browsers; localized (EN/DA) |
| PN532 spot writer (I2C) | Firmware team | ✅ Functional | NTAG21x verified; awaiting field reliability |
| RC522 spot writer (SPI) | Firmware team | ✅ Implemented | Works with MIFARE sticker tags; not for wands |
| Wand hardware (glass ampule NTAG216) | Design team | 🚧 In testing | Tip cavity design + ferrite rod tuning pending |
| Record 1 toy config UI (Toybox) | Frontend team | ✅ Working | Initializes blank wands with metadata and writes curated NFC actions |
| Multi-year wand support | Full stack | ✅ Implemented | Website and firmware both support; untested |

---

## Key Constraints & Design Decisions

### Data Storage
- **Total writable space assumption:** ~888 bytes per tag
- **Hunt records:** One per year, discovered by MIME type + year suffix
- **Spot limit:** 64 per year (8-byte bitmask format)
- **Record 1:** Always reserved for user NFC actions

### Offline & Decentralization
- No central server required for core collection loop
- Wand is the source of truth for collected spots
- Website reads wand, displays progress, provides hints (static JSON)
- Works in airplane mode; hunts run during connectivity blips

### Hardware Target
- **Wand tag:** NTAG215/216 (small glass ampule form factor, embedded in wooden wand tip)
- **Spot reader:** PN532 module (proven to read glass ampules; RC522 cannot)
- **Controller:** Wemos D1 Mini (ESP8266) with WiFi for optional spot status posting

---

## Documentation & Maintenance

**Read first:** [docs/MAINTENANCE.md](MAINTENANCE.md) for how to keep these docs in sync.

Key rule: When adding features, updating architecture, or changing data models, update these docs **in the same change**:

1. Update the relevant `docs/*.md` file (which one?)
2. Update the maintainer checklist in `.github/DOCUMENTATION-STRUCTURE.md`
3. If agent instructions apply, update `.github/instructions/*.instructions.md`
4. Update `AGENTS.md` summary if component roles changed

---

## Next Steps & Entry Points

- **First time contributor?** Start with [docs/05-BUILD-AND-DEPLOY.md](05-BUILD-AND-DEPLOY.md) to set up locally.
- **Implementing a feature?** Check [docs/02-VISION-AND-PURPOSE.md](02-VISION-AND-PURPOSE.md#working-agreement) for alignment checklist.
- **Buried in technical detail?** Read [docs/03-TECHNICAL-PROTOCOL.md](03-TECHNICAL-PROTOCOL.md) for on-tag format spec.
- **Want system overview?** See [docs/04-SYSTEM-ARCHITECTURE.md](04-SYSTEM-ARCHITECTURE.md) for flows and diagrams.
- **Adding a new year's hunt?** See `website/public/hunts/README.md` for the organizer guide.
- **Debugging NFC writes or reads?** Check `arduino/README.md` for troubleshooting.

---

## Quick Links

| Topic | Location |
|-------|----------|
| Vision & design principles | [docs/02-VISION-AND-PURPOSE.md](02-VISION-AND-PURPOSE.md) |
| On-tag data model | [docs/03-TECHNICAL-PROTOCOL.md](03-TECHNICAL-PROTOCOL.md) |
| System architecture & flows | [docs/04-SYSTEM-ARCHITECTURE.md](04-SYSTEM-ARCHITECTURE.md) |
| Build & deploy guide | [docs/05-BUILD-AND-DEPLOY.md](05-BUILD-AND-DEPLOY.md) |
| Doc maintenance rules | [docs/MAINTENANCE.md](MAINTENANCE.md) |
| Arduino setup & troubleshooting | [arduino/README.md](../arduino/README.md) |
| Hunt asset configuration | [website/public/hunts/README.md](../website/public/hunts/README.md) |
| Vue component conventions | [.github/instructions/vue-components.instructions.md](../.github/instructions/vue-components.instructions.md) |
