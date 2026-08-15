---
status: accepted
---

# Normalized wand ledger codec seam

## Context

The website and firmware had independent implementations of NDEF discovery,
metadata validation, UTF-8 handling, and 64-bit hunt masks. Web NFC exposes
normalized records while the spot writer works with native NDEF records, so
sharing browser or Arduino serialization code directly would couple unrelated
adapters.

## Decision

Use an adapter-neutral normalized wand-ledger model as the seam between
transport adapters and hunt behavior. Keep the normative wire behavior in the
[wand NFC data contract](../reference/wand-nfc-data-contract.md). Keep the
website NFC lifecycle in `nfcSession.ts` and the website integration in
`useNfc.ts`; ledger normalization, validation, diagnostics, and write planning
belong in `wandLedgerCodec.ts`.

Use one language-neutral fixture set for the website and current ESP32 target.
The ESP32 side consumes generated native test vectors rather than adding a
runtime JSON parser.

This is an implementation seam, not a promise that the current TypeScript
exports are the final cross-language API. The ESP32 adapter validation is the
next compatibility checkpoint; any incompatible interface change must update
this ADR and the contract together.

## Trade-offs

- Semantic normalized records allow Web NFC and firmware to preserve the same
  ledger meaning, but cannot promise byte-for-byte browser serialization.
- A shared fixture source adds a generation step, but avoids maintaining
  language-specific protocol examples or a JSON dependency in firmware.
- Keeping transport adapters separate makes the first implementation testable
  without hardware, while requiring a later ESP32 conformance checkpoint.

## Consequences

The contract remains the single source of truth for record ownership, exact
wire values, validation gates, preservation, repair, and write outcomes.
Website and firmware tests must consume the shared fixtures before the codec
work is considered complete.
