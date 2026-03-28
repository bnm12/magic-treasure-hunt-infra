# AGENTS

## Repository Scope

This repository currently contains two primary folders:

- `website/`: The PWA (Progressive Web App) workspace using Vue 3, TypeScript, and Vite for static-site build output.
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
- `website/` now uses **Vue 3** as the frontend framework with **Vite** as the build tool. Components are defined as Single-File Components (.vue files) with TypeScript and reactive state management.
- `website/src/App.vue` is the root component managing wand NFC scanning, hunt progress visualization, and record 1 toy configuration.
- `website/src/composables/useNfc.ts` encapsulates all Web NFC logic: scanning, MIME-based hunt record parsing, bitmask decoding/encoding of spot IDs, and record 1 writes with hunt record preservation.
- `website/src/components/HuntView.vue` renders a single year's hunt: branding header, progress bar, and a grid of `SpotCard.vue` components.
- `website/src/components/SpotCard.vue` renders a single spot with image, name, location, and contextual text (hint before collection, collected message after).
- `website/src/components/YearSelector.vue` renders year picker tabs when multiple hunt years are available.
- `website/src/components/ToyboxPanel.vue` provides the record 1 toy configuration UI with input validation and hunt-record preservation warning.
- `website/public/hunts/README.md` is the non-technical organizer guide for creating and updating yearly hunts.
- `arduino/` now includes a PN532-first NFC spot-writer sketch at `arduino/NFC_Basic/NFC_Basic.ino` for Wemos D1 Mini. It scans NTAG21x tags, verifies wand metadata (`x-hunt-meta`), upserts a yearly hunt MIME record (`x-hunt:<YYYY>`) with an 8-byte 64-bit spot mask payload, and keeps warm-reset-safe I2C recovery behavior (SDA unstick, Wire re-init, buffered response drain). Serial commands (`setSpot: X`, `setYear: YYYY`) allow dynamic configuration without recompile. Record 1 (URI wand link) support is handled via the NDEF library message builder.
- `arduino/RC522_Basic/RC522_Basic.ino` adds an RC522 SPI variant of the same spot-writer behavior for Wemos D1 Mini: stable CC preflight reads, metadata verification (`x-hunt-meta`), record 1 URI fill when missing, yearly hunt MIME upsert with 8-byte spot mask payload, and serial runtime configuration (`setSpot: X`, `setYear: YYYY`).
- `arduino/` includes setup documentation in `arduino/README.md`.
- Vision alignment is now explicitly documented around a kids treasure-hunt experience with city "magic spots" and a wand-based offline ledger.
- The intended long-term loop is year-over-year hunt continuity, where the same wand can retain prior years while joining new hunts.
- Record allocation intent is documented: wand record 1 remains available for normal user NFC use, while hunt ledger data uses dedicated yearly records discovered by MIME plus year metadata.
- **Wand authentication & metadata (2026-03-28)**: Each official wand now carries a metadata record (`x-hunt-meta` MIME type) with creation year (2 bytes) + owner name (variable length UTF-8). Spots refuse to write to tags lacking valid metadata, ensuring only initialized wands collect hunts. Tags are initialized from the website Toybox UI (Web NFC), which writes record 1 as the website URL plus the metadata record (no hunt records) to a blank tag. Website Web NFC composable parses metadata and displays owner name/creation year on scan. This is the first and only authentication mechanism: metadata record presence is treated as "official wand" flag.
- The website direction now includes a "toybox" section to configure common record 1 NFC actions (for example opening links).
- Hunt ledger data model: spot IDs are numeric (1, 2, 3...) and stored on-tag in a compact 8-byte binary MIME payload (64-bit spot mask). Year is encoded in the MIME media type as `x-hunt:<YYYY>`. This supports up to 64 spots per year with minimal storage overhead.
- Hunt asset design is decoupled from code: non-technical organizers manage JSON and images; website auto-detects new hunt years at build time; no backend server required.

## Session Learnings (2026-03-27)

- Treat writable NFC space as constrained: assume roughly 888 bytes total available on target tags and design for strict compactness.
- Hunt records must use the compact format: media type `x-hunt:<YYYY>` with payload exactly 8 bytes (64-bit spot mask only).
- Do not duplicate year inside the payload; derive year from the MIME media type suffix.
- Spot IDs are numeric and map directly to mask bits: spot 1 -> bit 0, ..., spot 64 -> bit 63.
- Until launch data exists, prefer a single strict on-tag format over compatibility branches (no legacy read/write paths by default).
- Serial commands allow spotId (1-64) and huntYear (2000-2100) to be reconfigured dynamically without reflash; changes persist for the session.
- **Record 1 support**: Attempted hand-rolled NDEF URI record encoding which broke tag scanning. Will use the battle-tested don/NDEF library instead for proper encoding. Hand-rolling NDEF is error-prone; use a library.
- On ESP8266 with intermittent RF reads, `MifareUltralight::read()` can crash due to parsing partial/invalid buffers; prefer guarded raw page reads for parse input, then use library `write()` for final NDEF encode/TLV/page writes.
- Data-loss guard added for both PN532 and RC522 sketches: if existing NDEF cannot be read, firmware now probes early user pages and refuses writes unless tag is confidently blank.
- **Wand metadata record design (2026-03-28)**: Authentication mechanism for official wands. Metadata record uses `x-hunt-meta` MIME type with compact payload: 2-byte year (big-endian) + 1-byte owner-name length + owner-name string. Spot writer refuses writes to tags without valid metadata. Website composable extracts and displays wand metadata on scan, and Toybox initializes blank tags as new wands by writing both record 1 website URL and the metadata record in one operation. Tight data budget: metadata record costs ~28 bytes for typical owner name (max 127 chars), leaving 860+ bytes for hunts (~10 years).

Keep this structure intentionally minimal for now.

## Change Documentation Rule

For every future change that expands, adds, or modifies the repository structurally or conceptually, update this `AGENTS.md` file in the same change.

This includes (but is not limited to):

- New top-level folders or major subfolders
- New applications/services/modules
- Significant architecture or workflow changes
- Cross-folder responsibility changes (for example, logic moved between `website/` and `arduino/`)
