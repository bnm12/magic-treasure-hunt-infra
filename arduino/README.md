# Arduino Workspace

Starter NFC firmware has been added based on the baseline in `D:/Dropbox/IOT/NFC`.

## Sketch

- `NFC_Basic/NFC_Basic.ino`

This sketch currently initializes an MFRC522 reader and prints card details (UID and metadata) to Serial at `115200` baud.

## Optional PN532 support

The sketch contains optional PN532 support behind:

- `#define ENABLE_PN532 0`

Set it to `1` only after PN532 libraries are installed.

## Library dependencies

Install these libraries in your Arduino environment:

- `MFRC522v2`
- `SPI` (built-in)

For optional PN532 mode:

- `PN532`
- `PN532_I2C`
- `Wire` (built-in)

## Wiring baseline (Wemos D1 Mini)

MFRC522 typical mapping used in this project:

- `SDA/SS` -> `D8 (GPIO15)`
- `SCK` -> `D5`
- `MISO` -> `D6`
- `MOSI` -> `D7`
- `RST` -> `D0` (optional depending on module/library setup)

## VS Code extension setup

Workspace config for Arduino tooling is in:

- `.vscode/arduino.json`

When hardware is connected later, set the serial `port` in that file (or via extension commands) before upload.
