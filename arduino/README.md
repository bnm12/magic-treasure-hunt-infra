# Arduino Workspace

The firmware path is now PN532-first on Wemos D1 Mini to improve Type A/NFC Forum tag compatibility for the wand flow.

## Sketch

- `NFC_Basic/NFC_Basic.ino`

This sketch initializes a PN532 in I2C mode and performs:

- ISO14443A polling with high passive activation retries
- UID reporting over serial (`115200`)
- NTAG21x page reads (`mifareultralight_ReadPage`)
- Basic NTAG profile guess from Capability Container (CC) bytes

The immediate purpose is to validate reliable NTAG216 detection and identify whether failures are firmware/configuration or RF-distance related.

## Library dependencies

Install these libraries in your Arduino environment:

- `PN532`
- `PN532_I2C`
- `Wire` (built-in)

## Wiring (Wemos D1 Mini + PN532, I2C)

Use PN532 in **I2C mode** (set module DIP/jumpers accordingly):

- `D1 (GPIO5)` -> `SCL`
- `D2 (GPIO4)` -> `SDA`
- `3V3` -> `VCC`
- `GND` -> `GND`

Notes:

- Keep wiring short and stable.
- Ensure the PN532 module is configured to I2C before powering.
- Most PN532 breakouts are safe and stable at 3.3V with ESP8266 logic levels.

## NTAG216 Reliability Notes (small glass ampules)

Small capsule tags and a few cm offset are near the physical limit for many hobby antennas. Software can improve polling robustness, but not antenna physics.

Recommended order:

1. Keep PN532 and verify reads at close range first (`<= 1 cm`) with this sketch.
2. Align tag axis with the reader coil; rotate slowly to find the coupling sweet spot.
3. Add ferrite backing behind the reader antenna to shape the field forward.
4. Use a larger tuned PN532 antenna board if available.
5. If your target interaction distance remains several cm with tiny capsules, evaluate dedicated LF/HF antenna hardware rather than switching only to RC522.

RC522 can still be kept as a fallback module, but it is usually not better than PN532 for marginal NTAG216 coupling distance.

## Next firmware step

After read reliability is acceptable, evolve this into spot logic that appends yearly spot IDs idempotently in the hunt MIME record while preserving user-owned record 1.
