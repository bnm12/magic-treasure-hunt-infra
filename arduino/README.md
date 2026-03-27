# Arduino Workspace

The firmware path is now PN532-first on Wemos D1 Mini to improve Type A/NFC Forum tag compatibility for the wand flow.

## Sketch

- `NFC_Basic/NFC_Basic.ino`

This sketch initializes a PN532 in I2C mode and performs:

- ISO14443A polling with high passive activation retries
- UID reporting over serial (`115200`)
- NTAG21x page reads (`mifareultralight_ReadPage`)
- Basic NTAG profile guess from Capability Container (CC) bytes
- I2C bus scan after PN532 wakeup attempts if initialization still fails
- I2C recovery cycles for warm-reset cases only after first init failure (SCL pulse release + Wire re-init)
- Non-NTAG detection by UID length (skips page dump for likely Mifare Classic tags)
- Continuous background PN532 re-initialization retries instead of halting forever after a failed startup

It also supports a compile-time SPI fallback for board diagnostics:

- Set `TRYLLESTAV_PN532_USE_SPI` to `1` at the top of `NFC_Basic.ino`
- Switch the PN532 module itself to SPI mode
- Rewire the D1 Mini to the SPI pins listed below

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

## If serial says "PN532 not detected over I2C"

Read the I2C scan output first.

- If it says `no I2C devices responded`, this is a wiring, power, or module-mode problem.
- If it finds devices but not `0x24`, the PN532 is not presenting its expected 7-bit I2C address and is likely not in I2C mode.
- If it finds `0x24` and `getFirmwareVersion()` still fails, the module is responding electrically but the library handshake is failing; in that case, check module quality, pull-ups, and cable length.

Most common causes on clone PN532 boards:

1. Interface selector still set to SPI or HSU/UART.
2. SDA and SCL swapped.
3. Board powered at the wrong rail or lacking common ground.
4. ESP8266 boot instability from poor wiring or brownout.
5. Long jumper wires or weak pull-ups on the module.
6. Module needs explicit I2C pull-ups if the breakout does not provide them.

Warm reset note:

- If pressing the D1 Mini reset button fails but USB power-cycle succeeds, the tag and PN532 path is valid and the issue is typically bus state recovery.
- This sketch now attempts automatic I2C recovery and re-initialization cycles before declaring PN532 missing.

Do not switch to RC522 until the PN532 I2C scan has been verified. A missing PN532 on the bus is not an NTAG216 compatibility issue.

## SPI fallback diagnostic wiring

If I2C shows no responding devices, test the PN532 board itself over SPI.

Set `TRYLLESTAV_PN532_USE_SPI` to `1` and wire:

- `D5 (GPIO14)` -> `SCK`
- `D6 (GPIO12)` -> `MISO`
- `D7 (GPIO13)` -> `MOSI`
- `D8 (GPIO15)` -> `SS` / `SSEL`
- `3V3` or `5V` -> `VCC` depending on module stability
- `GND` -> `GND`

If SPI works while I2C does not, the PN532 board is alive and the fault is isolated to interface mode, pull-ups, or I2C-side board issues.

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

After read reliability is acceptable, evolve this into spot logic that appends yearly spot IDs idempotently in compact hunt MIME records where year is encoded in media type (`application/vnd.tryllestav.hunt.year-<YYYY>`) and payload is an 8-byte 64-bit spot mask, while preserving user-owned record 1.
