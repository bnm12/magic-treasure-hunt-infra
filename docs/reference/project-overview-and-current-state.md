# Project overview and current state

Tryllestavsprojekt is an offline-first treasure hunt for children. A child finds a magic spot, taps a personal wand, and later scans the wand on the main website to see progress. The wand is the source of truth for collected spots; no central service is required for the core loop.

## Core loop

1. Find a magic spot.
2. Tap the wand at the spot box.
3. The spot writer records the collected spot on the wand.
4. Scan the wand on the main website.
5. View progress, missing spots, hints, and prior hunt years.

## Repository map

| Area | Responsibility |
| --- | --- |
| `website/` | Main website and management app, static hunt delivery, Web NFC, Web Serial, and Record 1 Toybox actions |
| `arduino/esp32/` | Current ESP32-C3 / LOLIN C3 Mini spot-writer firmware |
| `arduino/NFC_Basic/` and `arduino/RC522_Basic/` | Legacy Wemos D1 Mini / ESP8266 sketches |
| `website/public/hunts/` | Yearly hunt assets maintained by organisers |
| `docs/reference/` | Product, protocol, architecture, and content references |
| `docs/operations/` | Build, deployment, field, organiser, and documentation runbooks |
| `docs/adr/` | Accepted records of hard-to-reverse project decisions |
| `.github/instructions/` | Agent and contributor workflow rules |

## Current product surface

### Main website

The main website is the child-facing companion. It reads the wand ledger, resolves spot metadata from static hunt assets, and renders progress. Hunt state is read-only in this surface. The only website write is the user-controlled Record 1 action exposed by Toybox.

Web NFC scanning is supported on Android Chromium. Other browsers may open the URL stored in Record 1 but are not a supported hunt scanner.

The website is a Vue 3 and Vite PWA with English and Danish localization, multi-year hunt discovery, shared per-entry NFC lifecycle state, static JSON and image delivery, and an installable app surface. The main and management experiences are separate entry points in the same website workspace.

### Management app

The management app is the setup and operations surface. It initialises wands, performs approved bulk writes, configures spot boxes, and exposes deliberate debug utilities. It is not part of the child-facing hunt loop.

The management surface uses Web Serial and Bluetooth configuration paths where the current hardware supports them.

### Spot writers

The current hardware target is the ESP32-C3 on a LOLIN C3 Mini with a PN532 reader over I2C. Wemos D1 Mini / ESP8266 sketches remain legacy hardware variants and are not the current deployment target.

### Wand and tags

The design target is an NTAG216 glass ampoule embedded in the wand tip with roughly 888 bytes of writable space. Other tags can work when their capacity and coupling support the same data contract.

## Canonical references

- Product vision and wand hardware: [vision-and-wand-hardware.md](vision-and-wand-hardware.md)
- Wand wire contract: [wand-nfc-data-contract.md](wand-nfc-data-contract.md)
- System ownership and flows: [system-architecture-and-data-flows.md](system-architecture-and-data-flows.md)
- Developer setup: [developer-build-and-deploy.md](../operations/developer-build-and-deploy.md)
- Organiser runbook: [organiser-runbook.md](../operations/organiser-runbook.md)
- Hunt content guide: [`website/public/hunts/README.md`](../../website/public/hunts/README.md)
- Documentation maintenance: [documentation-maintenance.md](../operations/documentation-maintenance.md)
