# Vision and wand hardware

## Purpose

Tryllestavsprojekt makes a physical treasure hunt feel magical while keeping progress dependable, local, and owned by the child. The wand is both a durable hunt ledger and an open NFC object that can be used beyond the event.

## North star

Deliver a dependable find, tap, collect loop:

1. A child discovers a magic spot.
2. The child taps a wand at the spot.
3. The spot records the discovery offline.
4. The child scans the wand on the main website.
5. The same wand carries prior years into future hunts.

## Primary user outcomes

1. Children experience playful, discoverable magic rather than an app-first interaction.
2. Progress belongs to the child because it is carried on the wand.
3. The website gives friendly progress, missing-spot guidance, and hunt context.
4. One wand supports multiple hunt years without central synchronization.
5. Record 1 remains a creative NFC surface for links, text, contacts, maps, and similar actions.

## Design principles

### Offline by default

The core collection loop does not depend on WiFi, accounts, or a central server. Connectivity is needed only for optional website delivery and static hunt content that is not already available locally.

### Reliability before spectacle

Preserving existing wand data is more important than accepting a risky write. Clear feedback, safe refusal, capacity awareness, and partial-result reporting are preferred to silent failure.

### Record 1 stays free

Hunt logic never consumes or overwrites the user-controlled Record 1 action. The main website may write Record 1 through Toybox; hunt collection is performed by physical spot writers.

### Open tinkering is intentional

The project supports manual reprogramming and experimentation. Wand metadata is a validation and write gate, not cryptographic authentication or proof against a determined person with physical access.

## Wand form and tag target

The physical target is a hand-turned wooden wand with an NTAG216 glass ampoule in the tip. The tag is passive, sealed, and intended to survive repeated tapping and ordinary handling. Tip geometry, antenna alignment, and ferrite backing remain hardware reliability concerns for field validation.

The design target is approximately 888 bytes of writable tag capacity. NTAG216 is the reference target; other tags are acceptable when their capacity, NDEF support, and RF coupling permit the same contract.

## Current and legacy spot hardware

The current spot-writer target is a LOLIN C3 Mini using an ESP32-C3 and a PN532 reader over I2C. The C3 Mini also provides the current USB and Bluetooth configuration path used by the management app.

Wemos D1 Mini / ESP8266 sketches are retained as legacy variants for historical hardware and experiments. They are not the current deployment target and must not redefine the current wire contract.

## Supported scanner

The supported Web NFC hunt scanner is Chrome on Android (Android Chromium). iPhone and desktop browsers may still open a Record 1 URL, but they are not supported for scanning the wand ledger through Web NFC.

## Non-goals

- Cloud ownership of core hunt progress
- Required accounts or online synchronization
- Cryptographic anti-cheat guarantees
- Making the main website a general wand-write surface
- Replacing the physical hunt loop with a screen-only experience

See [wand-nfc-data-contract.md](wand-nfc-data-contract.md) for the exact wire format and [system-architecture-and-data-flows.md](system-architecture-and-data-flows.md) for module seams.
