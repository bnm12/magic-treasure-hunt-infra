# AGENTS

## Quick Links to Documentation

This repository is documented in structured layers starting with the project overview and building to technical details:

- **Just getting started?** → [`docs/01-PROJECT-OVERVIEW.md`](docs/01-PROJECT-OVERVIEW.md)
- **Want to build it locally?** → [`docs/05-BUILD-AND-DEPLOY.md`](docs/05-BUILD-AND-DEPLOY.md)
- **Aligning a feature with vision?** → [`docs/02-VISION-AND-PURPOSE.md`](docs/02-VISION-AND-PURPOSE.md)
- **Implementing NFC protocol?** → [`docs/03-TECHNICAL-PROTOCOL.md`](docs/03-TECHNICAL-PROTOCOL.md)
- **Understanding system architecture?** → [`docs/04-SYSTEM-ARCHITECTURE.md`](docs/04-SYSTEM-ARCHITECTURE.md)
- **Making a code change?** → [`docs/MAINTENANCE.md`](docs/MAINTENANCE.md)
- **Working with Vue components?** → [`.github/instructions/vue-components.instructions.md`](.github/instructions/vue-components.instructions.md)
- **Working with Arduino firmware?** → [`arduino/README.md`](arduino/README.md)

**For the full documentation structure:** See [`.github/DOCUMENTATION-STRUCTURE.md`](.github/DOCUMENTATION-STRUCTURE.md)

---

## Repository Scope

This repository currently contains two primary folders:

- `website/`: The PWA (Progressive Web App) workspace using Vue 3, TypeScript, and Vite for static-site build output.
- `arduino/`: The Arduino workspace for firmware, hardware interaction, and device-side logic.

---

## Component Overview

## Current Technical Capabilities

**For detailed component status, see:** [`docs/01-PROJECT-OVERVIEW.md#current-state-2026-03-28`](docs/01-PROJECT-OVERVIEW.md#current-state-2026-03-28)

**Website (`website/`):**

- Vue 3 + Vite PWA with Web NFC scanning
- Hunt visualization with progress tracking
- Record 1 Toybox with multi-action NFC presets (web links, messages, contact cards, maps, and more)
- Reusable page hero and isolated magic scan-circle components
- Local custom font asset support for decorative display moments
- Static hunt asset delivery (JSON + images per year)
- Auto-discovery of multi-year hunts on wand
- Base-aware static hosting for both repo subpaths and clean domain roots
- Installable PWA surface with manifest icons, mobile web app metadata, and an in-app install prompt
- Toybox admin utilities for wand initialization and debug-only treasure unlocking

**Arduino (`arduino/`):**

- PN532 (I2C) spot writer for NTAG21x tags (recommended for glass ampules)
- RC522 (SPI) variant for MIFARE sticker tags
- Yearly hunt MIME record writing with spot ID bitmasks
- Wand metadata authentication (`x-hunt-meta` record)
- Record 1 preservation guarantee
- Serial configuration interface (dynamic spotId, huntYear)

**Data Model:**

- Wand stores one hunt record per year with 64-bit spot mask
- Year encoded in MIME type (`x-hunt:<YYYY>`)
- 8-byte payload (compact binary); supports up to 64 spots/year
- Website resolves spot metadata via `(year, spotId)` JSON lookup
- Record 1 always reserved for user-defined NFC actions

**For exact on-tag protocol:** See [`docs/03-TECHNICAL-PROTOCOL.md`](docs/03-TECHNICAL-PROTOCOL.md)

## Change Documentation Rule

For every future change that expands, adds, or modifies the repository structurally or conceptually, update this `AGENTS.md` file in the same change.

This includes (but is not limited to):

- New top-level folders or major subfolders
- New applications/services/modules
- Significant architecture or workflow changes
- Cross-folder responsibility changes (for example, logic moved between `website/` and `arduino/`)
