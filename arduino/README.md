# Arduino Workspace

The firmware path is now PN532-first on Wemos D1 Mini to improve Type A/NFC Forum tag compatibility for the wand flow.

## Sketch

- `NFC_Basic/NFC_Basic.ino` (PN532 + I2C)
- `RC522_Basic/RC522_Basic.ino` (RC522 + SPI)

### PN532 (I2C)

This sketch initializes a PN532 in I2C mode and performs:

- ISO14443A polling with high passive activation retries
- UID reporting over serial (`115200`)
- NTAG21x page reads and writes (`mifareultralight_ReadPage`, `mifareultralight_WritePage`)
- Yearly hunt record MIME writing with spot ID bitmasks (8-byte 64-bit compact format)
- Warm-reset-safe I2C retry flow (SDA unstick + Wire re-init + PN532 buffered-response drain)
- Serial command interface for dynamic spotId and huntYear configuration (`setSpot: X`, `setYear: YYYY`)
- NDEF TLV parsing, record building, and idempotent record upsert

### RC522 (SPI)

This sketch initializes an MFRC522 over SPI and performs:

- ISO14443A polling with max RX antenna gain (`RxGain_max`)
- UID reporting over serial (`115200`)
- NTAG21x page reads and writes using Ultralight commands (`MIFARE_Read`, `MIFARE_Ultralight_Write`)
- Stable CC preflight checks (double-read matching) before write attempts
- Record 1 URI fill if missing (`https://192.168.1.131:5173`)
- Yearly hunt MIME upsert with compact 8-byte 64-bit spot mask payload
- Serial command interface for dynamic spotId and huntYear configuration (`setSpot: X`, `setYear: YYYY`)

## Library dependencies

Install these libraries in your Arduino environment:

- `PN532`
- `PN532_I2C`
- `MFRC522`
- `NDEF`
- `Wire` (built-in)
- `SPI` (built-in)

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

## Wiring (Wemos D1 Mini + RC522, SPI)

Use RC522 in **SPI mode**:

- `D8 (GPIO15)` -> `SDA/SS`
- `D3 (GPIO0)` -> `RST`
- `D5 (GPIO14)` -> `SCK`
- `D7 (GPIO13)` -> `MOSI` (`SDI` on some RC522 boards)
- `D6 (GPIO12)` -> `MISO` (`SDO` on some RC522 boards)
- `3V3` -> `VCC`
- `GND` -> `GND`

Notes:

- RC522 must run at **3.3V** on ESP8266.
- Keep SPI wires short; weak coupling is often wiring and antenna alignment, not software.
- If a board labels pin `SDA`, that is the **SS/CS** pin for SPI in this context.

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

## Hunt Records and Dynamic Configuration

The sketch writes and updates yearly hunt MIME records on the wand. Each record uses:

- **Media Type**: `application/vnd.tryllestav.hunt.year-<YYYY>` (e.g., `application/vnd.tryllestav.hunt.year-2026`)
- **Payload**: An 8-byte compact 64-bit bitmask encoding which spots have been collected
- **Idempotency**: Spot IDs are added (never removed), so writing the same tag multiple times is safe

### Serial Configuration

While the sketch is running, send commands via serial (115200 baud) to dynamically reconfigure:

```
setSpot: X          # Set spotId to X (1-64). Example: "setSpot: 5"
setYear: YYYY       # Set huntYear to YYYY (2000-2100). Example: "setYear: 2027"
```

Configuration persists for the session. Reset the board to return to default values (`spotId=3`, `huntYear=2026`).

### Future: Record 1 (Wand Link) via NDEF Library

Record 1 support will be added using the [don/NDEF](https://github.com/don/NDEF) library to properly encode a clickable URI record. This will be implemented to preserve existing hunt records while adding a user-facing link.

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
