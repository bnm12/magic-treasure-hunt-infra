---
status: accepted
---

# Retire legacy ESP8266 spot-writer sketches

## Context

`arduino/NFC_Basic/` and `arduino/RC522_Basic/` are Wemos D1 Mini /
ESP8266 sketches with independent NDEF handling. They predate the portable
ESP32 codec, are not part of the current management workflow, and cannot be
validated against the current wand contract without reviving separate hardware
adapters. `RC522_Basic` also depends on a shared header that is no longer
present at its historical include path.

Keeping these paths buildable would make it easy to deploy firmware that can
drop opaque records or diverge from the current metadata and hunt-record
rules.

## Decision

Retire both legacy paths by removing their tracked sketches and board
configuration. Historical source remains in Git history only. All supported
spot-writer work uses the ESP32-C3 / LOLIN C3 Mini implementation in
`arduino/esp32/`.

## Alternatives considered

- **Migrate both sketches to the portable codec:** rejected for this bounded
  slice because it would require two unvalidated transport adapters and
  preserve obsolete hardware paths.
- **Leave the sketches buildable but undocumented:** rejected because a
  successful legacy build could be mistaken for contract conformance.

## Consequences

The supported hardware matrix is smaller and explicit: current field
validation targets the ESP32-C3 / PN532 spot writer only. Existing Wemos D1
Mini / ESP8266 hardware is unsupported and must be replaced or kept out of
field deployment.
