---
status: accepted
---

# Normalized wand ledger codec seam

The website introduces an adapter-neutral normalized codec before the staged
ESP32 migration. It preserves Record 1 opaquely, carries every
representable NDEF field and raw payload bytes, and canonicalizes output
because Web NFC cannot guarantee the original serialized bytes.

The codec owns exact type recognition, typed diagnostics, golden fixtures,
duplicate hunt merge, invalid-record repair during intentional writes, metadata
write gating, spot-ID validation, and capacity preflight. Reads remain
non-mutating and expose safe valid progress plus diagnostics. Valid duplicate
hunt records merge by bitwise OR; an exact hunt type with a bad payload is
renamed to `x-hunt-invalid:<YYYY>` only during a write.

The language-neutral JSON fixtures are authoritative for the website now and
will later support generated ESP32 test vectors. NFC session lifecycle remains
in the shared website session adapter, while ledger interpretation stays behind
the codec seam. This keeps the first migration slice testable without changing
firmware and prevents browser-specific serialization behavior from becoming
the protocol.
