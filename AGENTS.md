# Tryllestavsprojekt agent router

Read the smallest canonical document that covers the task:

- **Project orientation:** [`docs/reference/project-overview-and-current-state.md`](docs/reference/project-overview-and-current-state.md)
- **Vision and wand hardware:** [`docs/reference/vision-and-wand-hardware.md`](docs/reference/vision-and-wand-hardware.md)
- **Wand wire contract:** [`docs/reference/wand-nfc-data-contract.md`](docs/reference/wand-nfc-data-contract.md)
- **Architecture and flows:** [`docs/reference/system-architecture-and-data-flows.md`](docs/reference/system-architecture-and-data-flows.md)
- **Build and deployment:** [`docs/operations/developer-build-and-deploy.md`](docs/operations/developer-build-and-deploy.md)
- **Event operations:** [`docs/operations/organiser-runbook.md`](docs/operations/organiser-runbook.md)
- **Documentation maintenance:** [`docs/operations/documentation-maintenance.md`](docs/operations/documentation-maintenance.md)
- **Domain glossary:** [`CONTEXT.md`](CONTEXT.md)
- **Hard-to-reverse decisions:** [`docs/adr/`](docs/adr/)
- **Agent workflow rules:** [`.github/instructions/`](.github/instructions/)
- **Hunt content authoring:** [`website/public/hunts/README.md`](website/public/hunts/README.md)
- **Vue component conventions:** [`.github/instructions/vue-components.instructions.md`](.github/instructions/vue-components.instructions.md)
- **Website debugging:** [`.github/instructions/dev-debugging.instructions.md`](.github/instructions/dev-debugging.instructions.md)

## Repository scope

- `website/` contains the main child-facing website and the management app.
- `arduino/esp32/` contains the current ESP32-C3 / LOLIN C3 Mini spot writer.
- `arduino/NFC_Basic/` and `arduino/RC522_Basic/` are retired paths; historical Wemos D1 Mini / ESP8266 source remains in Git history only.
- `docs/reference/` contains canonical product, protocol, architecture, and content references.
- `docs/operations/` contains build, deployment, organiser, field, and documentation runbooks.
- `docs/adr/` records accepted hard-to-reverse decisions.

## Non-negotiable invariants

- Preserve the core loop: find spot -> tap wand -> collect -> scan website -> view progress.
- Wand data remains the source of truth; the core loop does not require a central server.
- Use the exact wire values `x-hunt:<YYYY>` and `x-hunt-meta`.
- Discover records by type and year; physical record order is non-semantic.
- The first logical NDEF record is Record 1, remains user-controlled, and is preserved opaquely.
- Valid metadata is a deliberate validation/write gate, not cryptographic authentication.
- The main website reads hunt state and writes only Record 1. Management owns setup, bulk-write, and debug operations.
- The current hardware target is ESP32-C3 / LOLIN C3 Mini with PN532 over I2C.
- The design target is NTAG216 glass ampoule capacity of roughly 888 writable bytes; other tags work only when capacity permits.

Structural or conceptual changes require the relevant canonical document and this router to be updated in the same change.
