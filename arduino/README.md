# Arduino Workspace

The firmware path is now PN532-first on Wemos D1 Mini to improve Type A/NFC Forum tag compatibility for the wand flow.

## Sketch

- `NFC_Basic/NFC_Basic.ino`

This sketch initializes a PN532 in I2C mode and performs:

- ISO14443A polling with high passive activation retries
- UID reporting over serial (`115200`)
- NTAG21x page reads (`mifareultralight_ReadPage`)
- Basic NTAG profile guess from Capability Container (CC) bytes
- Warm-reset-safe I2C retry flow (SDA unstick + Wire re-init + PN532 buffered-response drain)
- Non-NTAG detection by UID length (skips page dump for likely Mifare Classic tags)
- Continuous background PN532 re-initialization retries instead of halting forever after a failed startup

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

Common module-specific gotchas:

- Elechouse PN532 V3/V4 boards default to **HSU/UART** mode. Their selector must be set to `Channel 1 = ON`, `Channel 2 = OFF` for I2C.
- Adafruit PN532 breakouts use `SEL0/SEL1` jumpers and may require external pull-ups on `SDA` and `SCL` for I2C.
- Seeing `SDA` and `SCL` silkscreen labels on the header does **not** mean the board is already in I2C mode.

## If serial says "PN532 not detected"

With this I2C-only sketch, repeated detection failure is usually one of these:

1. PN532 module is not actually in I2C mode.
2. SDA/SCL wiring is wrong or intermittent.
3. Power/ground is unstable.
4. Pull-ups on SDA/SCL are too weak or missing for your breakout/cable length.
5. Very long jumpers are degrading the bus.

Most common causes on clone PN532 boards:

1. Interface selector still set to SPI or HSU/UART.
2. SDA and SCL swapped.
3. Board powered at the wrong rail or lacking common ground.
4. ESP8266 boot instability from poor wiring or brownout.
5. Long jumper wires or weak pull-ups on the module.
6. Module needs explicit I2C pull-ups if the breakout does not provide them.

Warm reset note:

- If pressing the D1 Mini reset button fails but USB power-cycle succeeds, the tag and PN532 path is valid and the issue is typically bus state recovery.
- This sketch now attempts automatic I2C bus unstick, re-init, and buffered-response drain before each retry.

Do not switch to RC522 until PN532 I2C mode and wiring have been verified. A missing PN532 on the bus is not an NTAG216 compatibility issue.

## NTAG216 Reliability Notes (small glass ampules)

Small capsule tags and a few cm offset are near the physical limit for many hobby antennas. Software can improve polling robustness, but not antenna physics.

Recommended order:

1. Keep PN532 and verify reads at close range first (`<= 1 cm`) with this sketch.
2. Align tag axis with the reader coil; rotate slowly to find the coupling sweet spot.
3. Add ferrite backing behind the reader antenna to shape the field forward.
4. Use a larger tuned PN532 antenna board if available.
5. If your target interaction distance remains several cm with tiny capsules, evaluate dedicated LF/HF antenna hardware.

## Next firmware step

After read reliability is acceptable, evolve this into spot logic that appends yearly spot IDs idempotently in compact hunt MIME records where year is encoded in media type (`application/vnd.tryllestav.hunt.year-<YYYY>`) and payload is an 8-byte 64-bit spot mask, while preserving user-owned record 1.
