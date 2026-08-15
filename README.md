# Tryllestavsprojekt

Tryllestavsprojekt is an offline-first treasure hunt for children. A child finds a magic spot, taps a personal NFC wand, and later scans the wand on the website to see progress. The wand is the source of truth for collected spots.

## Quick start

```bash
cd website
npm install
npm run dev
npm run build
```

For firmware and hardware setup, read [developer-build-and-deploy.md](docs/operations/developer-build-and-deploy.md).

## Documentation

| Need | Canonical document |
| --- | --- |
| Project orientation and current state | [project-overview-and-current-state.md](docs/reference/project-overview-and-current-state.md) |
| Vision and wand hardware | [vision-and-wand-hardware.md](docs/reference/vision-and-wand-hardware.md) |
| Exact wand data contract | [wand-nfc-data-contract.md](docs/reference/wand-nfc-data-contract.md) |
| Architecture and data flows | [system-architecture-and-data-flows.md](docs/reference/system-architecture-and-data-flows.md) |
| Build, deploy, and troubleshoot | [developer-build-and-deploy.md](docs/operations/developer-build-and-deploy.md) |
| Run an event | [organiser-runbook.md](docs/operations/organiser-runbook.md) |
| Keep docs consistent | [documentation-maintenance.md](docs/operations/documentation-maintenance.md) |
| Understand project terms | [CONTEXT.md](CONTEXT.md) |
| Review hard-to-reverse decisions | [docs/adr/](docs/adr/) |
| Create hunt content | [website/public/hunts/README.md](website/public/hunts/README.md) |
| Follow agent workflow rules | [.github/instructions/](.github/instructions/) |

## Product surfaces

- The main website reads hunt state and writes only the user-controlled Record 1 action.
- The management app handles wand initialisation, bulk writes, spot configuration, and deliberate debug operations.
- The current spot-writer target is ESP32-C3 / LOLIN C3 Mini with PN532 over I2C.
- Wemos D1 Mini / ESP8266 sketches are legacy variants.
- Android Chromium is the supported Web NFC scanner.
