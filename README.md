# Tryllestavsprojekt 🪄

A decentralized, offline-first treasure hunt experience for children. Kids use hand-crafted wooden **wands** (each containing a passive NFC tag) to collect spots placed around a city or event venue. All collected data lives on the wand itself — **no server required**.

---

## The Magic Loop

1. **Find** a magic spot in the city (physical plaque with NFC reader)
2. **Tap** your wand against the reader
3. **Collect** proof of discovery (written to your wand, instantly)
4. **Scan** your wand on the website to see progress and get hints
5. **Year after year**, the same wand accumulates more hunts

---

## Why Wands?

- **Offline**: Works in airplane mode, during outages, anywhere with no internet
- **Passive**: No batteries, no charging, no updates needed — wand lasts forever
- **Decentralized**: Your wand is the source of truth; no cloud required
- **Magical**: Feels like real magic — not "I'm interacting with an app"

---

## Quick Start

### For Developers

**Want to build locally?** Start here:

```bash
# Clone and set up website
git clone <repo>
cd Tryllestavsprojekt/website
npm install
npm run dev           # Dev server at http://localhost:5173
npm run build         # Production build
```

**Want to set up Arduino firmware?** See [arduino/README.md](arduino/README.md) for wiring, library installation, and troubleshooting.

**Full build & deploy guide:** See [docs/05-BUILD-AND-DEPLOY.md](docs/05-BUILD-AND-DEPLOY.md)

### For Hunt Organizers

**Want to create a hunt?** See [website/public/hunts/README.md](website/public/hunts/README.md) — edit JSON and add images, no coding required.

---

## What's Inside

- **`website/`** — Vue 3 PWA for wand scanning and hunt visualization
- **`arduino/`** — Firmware for spot NFC writers (PN532 + RC522 variants)
- **`docs/`** — Comprehensive documentation (vision, protocol, architecture, build guide)

---

## Documentation Roadmap

Start with what you need:

| I want to...                   | Read                                                                     |
| ------------------------------ | ------------------------------------------------------------------------ |
| Understand the project         | [docs/01-PROJECT-OVERVIEW.md](docs/01-PROJECT-OVERVIEW.md)               |
| Understand the vision          | [docs/02-VISION-AND-PURPOSE.md](docs/02-VISION-AND-PURPOSE.md)           |
| Learn the technical protocol   | [docs/03-TECHNICAL-PROTOCOL.md](docs/03-TECHNICAL-PROTOCOL.md)           |
| Understand system architecture | [docs/04-SYSTEM-ARCHITECTURE.md](docs/04-SYSTEM-ARCHITECTURE.md)         |
| Build locally (step-by-step)   | [docs/05-BUILD-AND-DEPLOY.md](docs/05-BUILD-AND-DEPLOY.md)               |
| Keep docs in sync              | [docs/MAINTENANCE.md](docs/MAINTENANCE.md)                               |
| See full doc structure         | [.github/DOCUMENTATION-STRUCTURE.md](.github/DOCUMENTATION-STRUCTURE.md) |

---

## Current Status (2026-03-28)

### ✅ Completed

- Hunt asset system (JSON + images; organizers don't code)
- Web NFC scanning and wand visualization
- Spot writer firmware (PN532 & RC522 sketches)
- Record 1 reserved; Toybox UI for wand configuration
- Wand metadata record (authentication via `x-hunt-meta`)
- Compact data model (8-byte spot mask per year)

### 🚧 In Progress

- PN532 I2C reliability with glass ampule tags (field testing)
- Wand form factor (wooden wand design + ferrite rod tuning)
- Spot network deployment (5–10 prototype spots)
- Multi-year hunt support validation

See [docs/01-PROJECT-OVERVIEW.md#current-state-2026-03-28](docs/01-PROJECT-OVERVIEW.md#current-state-2026-03-28) for detailed component status.

---

## Tech Stack

### Website

- **Framework:** Vue 3 + TypeScript
- **Build:** Vite
- **NFC:** Browser Web NFC API (Chrome 108+, Edge, Samsung Internet)
- **Deployment:** Static site (PWA)

### Arduino Firmware

- **Board:** Wemos D1 Mini (ESP8266)
- **Reader:** PN532 (I2C) for glass ampules; RC522 (SPI) for stickers
- **Tags:** NTAG215/216 (passive NFC)
- **Libraries:** PN532, MFRC522, NDEF

---

## Getting Help

### Development Questions

- See [docs/05-BUILD-AND-DEPLOY.md#troubleshooting-guide](docs/05-BUILD-AND-DEPLOY.md#troubleshooting-guide)
- Check Arduino setup: [arduino/README.md](arduino/README.md)
- Check Vue patterns: [.github/instructions/vue-components.instructions.md](.github/instructions/vue-components.instructions.md)

### Design & Vision Questions

- See [docs/02-VISION-AND-PURPOSE.md](docs/02-VISION-AND-PURPOSE.md)
- Review alignment checklist: [docs/02-VISION-AND-PURPOSE.md#working-agreement](docs/02-VISION-AND-PURPOSE.md#working-agreement)

### Data Format Questions

- See [docs/03-TECHNICAL-PROTOCOL.md](docs/03-TECHNICAL-PROTOCOL.md) (source of truth for on-tag format)

---

## Contributing

Before making changes, please:

1. **Check alignment** using [docs/02-VISION-AND-PURPOSE.md#working-agreement](docs/02-VISION-AND-PURPOSE.md#working-agreement)
2. **Update docs** with your change using [docs/MAINTENANCE.md](docs/MAINTENANCE.md) checklist
3. **Test locally** — run both website and firmware as appropriate
4. **Submit PR** with both code and doc updates in the same commit

See [.github/instructions/project-vision.instructions.md](.github/instructions/project-vision.instructions.md) for detailed alignment guidance.

---

## Principles

- **Offline first** — No server required for core gameplay
- **Decentralized** — Wand is the source of truth
- **Reliability over spectacle** — Data loss prevention is paramount
- **Kid-first clarity** — Interactions feel magical and understandable
- **Record 1 is free** — Wand's user-facing NFC action always stays available

See [docs/02-VISION-AND-PURPOSE.md#design-principles](docs/02-VISION-AND-PURPOSE.md#design-principles) for full principles.

---

## License

(Add your license here if applicable)

---

## Questions?

- **New to the project?** Start with [docs/01-PROJECT-OVERVIEW.md](docs/01-PROJECT-OVERVIEW.md)
- **Want to build it?** See [docs/05-BUILD-AND-DEPLOY.md](docs/05-BUILD-AND-DEPLOY.md)
- **Documentation index:** [.github/DOCUMENTATION-STRUCTURE.md](.github/DOCUMENTATION-STRUCTURE.md)
