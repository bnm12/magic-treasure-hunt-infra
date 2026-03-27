# AGENTS

## Repository Scope

This repository currently contains two primary folders:

- `website/`: The PWA (Progressive Web App) workspace, currently scaffolded with TypeScript and static-site build output.
- `arduino/`: The Arduino workspace for firmware, hardware interaction, and device-side logic.

Supporting guidance and planning artifacts:

- `VISION.md`: Shared product vision, goals, non-goals, and milestone framing.
- `docs/schematics.md`: Mermaid schematics for architecture, user flows, and delivery phases.
- `.github/instructions/project-vision.instructions.md`: Agent guidance for making changes aligned with project intent.

Current conceptual capability notes:

- `website/` now includes a basic experimental Web NFC feature for scanning and writing text NDEF records on compatible devices/browsers.
- `website/public/hunts/` now contains the hunt asset delivery system: JSON-based hunt metadata and yearly spot definitions, bundled at build time for offline-first companion web use.
- `website/public/hunts/[YEAR]/hunt.json` is the canonical hunt definition: it includes year branding (title, description, banner image) plus all spots for that year. Non-technical hunt organizers edit this file and add images without coding.
- `website/src/utils/spotLoader.ts` provides typed loaders for hunts and spots; discovery is automatic by year (supports multi-year hunts on one wand).
- `website/src/components/` includes `huntHeader.ts` (renders year branding) and `spotCard.ts` (renders spot details with hint/collected state toggle).
- `website/public/hunts/README.md` is the non-technical organizer guide for creating and updating yearly hunts.
- `arduino/` now includes a PN532-first NFC diagnostic firmware sketch at `arduino/NFC_Basic/NFC_Basic.ino` for Wemos D1 Mini, with NTAG21x page-read diagnostics to validate tag detection reliability.
- `arduino/` includes setup documentation in `arduino/README.md`.
- Vision alignment is now explicitly documented around a kids treasure-hunt experience with city "magic spots" and a wand-based offline ledger.
- The intended long-term loop is year-over-year hunt continuity, where the same wand can retain prior years while joining new hunts.
- Record allocation intent is documented: wand record 1 remains available for normal user NFC use, while hunt ledger data uses dedicated yearly records discovered by MIME plus year metadata.
- The website direction now includes a "toybox" section to configure common record 1 NFC actions (for example opening links).
- Hunt ledger constraints are explicit: one compact spot-ID list per year, idempotent append by spots, and external `(year, spotId)` lookup for rich content.
- Hunt asset design is decoupled from code: non-technical organizers manage JSON and images; website auto-detects new hunt years at build time; no backend server required.

Keep this structure intentionally minimal for now.

## Change Documentation Rule

For every future change that expands, adds, or modifies the repository structurally or conceptually, update this `AGENTS.md` file in the same change.

This includes (but is not limited to):

- New top-level folders or major subfolders
- New applications/services/modules
- Significant architecture or workflow changes
- Cross-folder responsibility changes (for example, logic moved between `website/` and `arduino/`)
