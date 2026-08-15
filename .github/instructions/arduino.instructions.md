---
description: "Use when changing Arduino firmware, wiring, or spot-writer behavior."
applyTo: "arduino/**"
---

# Spot-writer ownership

Read the [wand contract](../../docs/reference/wand-nfc-data-contract.md), [hardware reference](../../docs/reference/vision-and-wand-hardware.md), and [developer runbook](../../docs/operations/developer-build-and-deploy.md) before changing firmware or wiring.

- The current target is ESP32-C3 / LOLIN C3 Mini with PN532 over I2C.
- Wemos D1 Mini / ESP8266 sketches are legacy variants and do not redefine the current contract.
- Validate `x-hunt-meta` before dependent hunt writes; this is a write gate, not cryptographic authentication.
- Discover hunt records by `x-hunt:<YYYY>` type and year, never by physical order.
- Preserve Record 1, metadata, prior hunt years, and unrelated records.
- Refuse unsafe reads and report capacity or partial-write outcomes explicitly.
