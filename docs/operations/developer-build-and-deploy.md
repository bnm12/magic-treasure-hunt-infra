# Developer build and deploy

This runbook covers website development, current spot-writer setup, and deployment checks. For event preparation and child-facing support, use [organiser-runbook.md](organiser-runbook.md).

## Prerequisites

- Node.js and npm for the website
- Arduino CLI for firmware
- Chrome on Android for Web NFC scanning
- A LOLIN C3 Mini (ESP32-C3), PN532 reader, USB-C cable, and NTAG216 test tags
- No supported Wemos D1 Mini / ESP8266 deployment; those paths are retired and historical source remains in Git history only

## Website and codec tests

From the repository root:

```bash
npm install
npm test
npm run build
npm run dev
```

The root workspace installs the website dependencies and the pinned portable
Zig host compiler. `npm test` runs the website Vitest contract tests followed
by the native C++ wand codec conformance tests. The suite does not require a
browser, Web NFC hardware, or browser automation.

The dev server is for local browser testing. Production output is the static
`dist/` directory. The main website and management app are separate entry
points in the same build. Run only the website tests with
`npm run test:website`, or only the native codec tests with
`npm run test:native`.

The website fixture at
`website/src/utils/test-fixtures/wand-ledger-codec.json` is also the source for
the portable ESP32 conformance vectors. Regenerate the native header from the
repository root after changing the fixture:

```powershell
npm run generate:fixtures
```

The native test runner compiles and executes the portable codec with the
workspace's pinned Zig host compiler. The native seam has no Arduino,
NDEF-library, BLE, EEPROM, or JSON dependency. It is compiled into the current
ESP32 sketch as `WandNdefCodec.cpp`.

The separate Arduino CLI remains necessary for the target firmware build below.

The supported hunt scanner is Chrome on Android. Use [dev-debugging.instructions.md](../../.github/instructions/dev-debugging.instructions.md) for browser inspection rules.

Locale strings live in `website/src/locales/`. Keep the English and Danish key sets in parity when editing translations. Hunt titles, spot names, hints, and images belong in the year folder described by [`website/public/hunts/README.md`](../../website/public/hunts/README.md), not in Vue components.

## Current firmware: ESP32-C3 / LOLIN C3 Mini

The current sketch is `arduino/esp32/esp32.ino`. The exact board package name can be checked with:

```powershell
arduino-cli board listall | findstr /I "LOLIN C3 Mini"
```

With the installed ESP32 core, the expected build command is:

```powershell
arduino-cli compile --fqbn esp32:esp32:lolin_c3_mini arduino/esp32
```

Upload and serial monitoring use the port reported by `arduino-cli board list`:

```powershell
arduino-cli upload --fqbn esp32:esp32:lolin_c3_mini --port COM3 arduino/esp32
arduino-cli monitor --port COM3 --config baudrate=115200
```

If the installed core reports a different LOLIN C3 Mini FQBN, use that value rather than guessing.

### PN532 I2C wiring

The current C3 Mini wiring is:

```text
LOLIN C3 Mini GPIO8  -> PN532 SDA
LOLIN C3 Mini GPIO10 -> PN532 SCL
LOLIN C3 Mini 3V3    -> PN532 VCC
LOLIN C3 Mini GND    -> PN532 GND
```

Set the PN532 breakout to I2C mode. Keep the wires short and verify the shared ground before debugging software.

### Management connections

The management app configures the C3 Mini over USB Web Serial or Bluetooth. Bluetooth advertising is intentionally enabled by the physical button so an installed spot is not accidentally reconfigured.

## Legacy firmware

`arduino/NFC_Basic/` and `arduino/RC522_Basic/` are retired paths; their
tracked sketches and board configs have been removed. Historical source
remains in Git history only. Do not recreate or deploy those old board
assumptions; the supported firmware build is the ESP32-C3 target above.

## Libraries

Install the PN532 library required by `arduino/esp32/esp32.ino`. `Wire`,
`EEPROM`, and the Bluetooth headers are supplied by the ESP32 core. The
current sketch uses its portable codec and does not require the retired
MFRC522 or legacy NDEF libraries.

## Build and deployment checks

Before a field deployment:

1. Build the website.
2. Compile the current ESP32 sketch.
3. Initialize a test wand through the management app.
4. Configure one spot with the intended year and spot ID.
5. Tap the wand and verify the result in the terminal.
6. Scan the same wand on Android Chrome.
7. Confirm Record 1 and prior-year progress remain present.

## Troubleshooting

### PN532 not detected

Check I2C mode, SDA/SCL mapping, 3.3 V power, shared ground, short wires, and pull-ups. A power cycle is a valid first recovery step.

### Web NFC is unavailable

Use Chrome on Android over a secure origin or localhost. iPhone and unsupported desktop browsers cannot scan the wand ledger through Web NFC.

### Spot refuses a wand

Initialize the wand first. A missing or malformed `x-hunt-meta` record is an intentional write gate.

### Write is refused after an unstable read

Keep the wand still and retry. A non-blank tag that cannot be read safely must not be initialised or overwritten.

### Capacity or partial result

Treat the reported result as authoritative. Do not retry blindly if the device reports a partial write; inspect the wand and preserve any records that were successfully written.

See [wand-nfc-data-contract.md](../reference/wand-nfc-data-contract.md) for protocol invariants.
