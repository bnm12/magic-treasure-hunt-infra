// Set to 1 to test PN532 over SPI instead of I2C.
#define TRYLLESTAV_PN532_USE_SPI 0

#if TRYLLESTAV_PN532_USE_SPI
#define NFC_INTERFACE_SPI
#include <SPI.h>
#include <PN532_SPI.h>
#else
#define NFC_INTERFACE_I2C
#include <Wire.h>
#include <PN532_I2C.h>
#endif

#include <PN532.h>
#include <ESP8266WiFi.h>

// Wemos D1 Mini I2C defaults:
// D1 (GPIO5) -> SCL
// D2 (GPIO4) -> SDA
// 3V3 -> VCC
// GND -> GND
// PN532 in I2C mode (DIP/jumper on module)

// SPI fallback wiring (set TRYLLESTAV_PN532_USE_SPI=1):
// D5 (GPIO14) -> SCK, D6 (GPIO12) -> MISO, D7 (GPIO13) -> MOSI, D8 (GPIO15) -> SS

constexpr uint8_t kI2cSdaPin = 4;
constexpr uint8_t kI2cSclPin = 5;
constexpr uint8_t kSpiSsPin = 15;

// 1200 ms lets the PN532 fully settle after a cold boot before we probe.
constexpr uint16_t kPn532BootDelayMs = 1200;

// On ESP8266, 0xFF retries can block long enough to trigger watchdog resets.
constexpr uint8_t kPassiveActivationRetries = 0x20;
constexpr uint16_t kPollIntervalMs = 50;
constexpr uint16_t kReadDebounceMs = 400;

// Pages read for diagnostics: header + first user pages.
constexpr uint8_t kReadStartPage = 0;
constexpr uint8_t kReadEndPage = 15;

// PN532 I2C slave address (7-bit).
constexpr uint8_t kPn532I2cAddress = 0x24;

#if TRYLLESTAV_PN532_USE_SPI
PN532_SPI pn532Spi(SPI, kSpiSsPin);
PN532 pn532(pn532Spi);
#else
PN532_I2C pn532I2c(Wire);
PN532 pn532(pn532I2c);
#endif

uint8_t lastUid[7] = {0};
uint8_t lastUidLength = 0;
uint32_t lastSeenAt = 0;
bool initialized = false;
uint32_t lastRetryAt = 0;

// ---- helpers ----------------------------------------------------------------

void printHexByte(uint8_t value) {
  if (value < 0x10) Serial.print('0');
  Serial.print(value, HEX);
}

void printUid(const uint8_t* uid, uint8_t uidLength) {
  for (uint8_t i = 0; i < uidLength; i++) {
    printHexByte(uid[i]);
    if (i + 1 < uidLength) Serial.print(':');
  }
}

bool sameUid(const uint8_t* uid, uint8_t uidLength) {
  if (uidLength != lastUidLength) return false;
  for (uint8_t i = 0; i < uidLength; i++) {
    if (uid[i] != lastUid[i]) return false;
  }
  return true;
}

void rememberUid(const uint8_t* uid, uint8_t uidLength) {
  for (uint8_t i = 0; i < uidLength && i < sizeof(lastUid); i++) {
    lastUid[i] = uid[i];
  }
  lastUidLength = uidLength;
  lastSeenAt = millis();
}

// ---- NTAG page dump ---------------------------------------------------------

bool readAndPrintPage(uint8_t page, uint8_t* data) {
  if (!pn532.mifareultralight_ReadPage(page, data)) {
    Serial.print("  page "); Serial.print(page); Serial.println(": read failed");
    return false;
  }
  Serial.print("  page "); Serial.print(page); Serial.print(": ");
  for (uint8_t i = 0; i < 4; i++) {
    printHexByte(data[i]);
    if (i < 3) Serial.print(' ');
  }
  Serial.println();
  return true;
}

void printTagProfileFromCc(const uint8_t* ccPage) {
  // CC at page 3: E1 10 <size> 00
  if (ccPage[0] != 0xE1) {
    Serial.println("  CC byte 0 != E1, tag may not be NTAG21x/NDEF formatted.");
    return;
  }
  Serial.print("  CC size byte: 0x"); printHexByte(ccPage[2]); Serial.println();
  if      (ccPage[2] == 0x6D) Serial.println("  Tag profile: NTAG216");
  else if (ccPage[2] == 0x3E) Serial.println("  Tag profile: NTAG215");
  else if (ccPage[2] == 0x12) Serial.println("  Tag profile: NTAG213");
  else                        Serial.println("  Tag profile: unknown NTAG variant");
}

void dumpNtagPages() {
  Serial.print("Reading pages "); Serial.print(kReadStartPage);
  Serial.print(".."); Serial.println(kReadEndPage);

  uint8_t data[4] = {0};
  uint8_t ccPage[4] = {0};
  bool ccRead = false;

  for (uint8_t page = kReadStartPage; page <= kReadEndPage; page++) {
    if (!readAndPrintPage(page, data)) {
      if (page == kReadStartPage) {
        Serial.println("  Aborting: first page read failed.");
      }
      break;
    }
    if (page == 3) {
      memcpy(ccPage, data, 4);
      ccRead = true;
    }
    yield();
  }

  if (ccRead) printTagProfileFromCc(ccPage);
}

// ---- PN532 configuration after successful detection ------------------------

void configurePn532(uint32_t versionData) {
  Serial.print("PN532 FW: PN5");
  Serial.print((versionData >> 24) & 0xFF, HEX);
  Serial.print(" v");
  Serial.print((versionData >> 16) & 0xFF, DEC);
  Serial.print('.');
  Serial.println((versionData >> 8) & 0xFF, DEC);
  pn532.setPassiveActivationRetries(kPassiveActivationRetries);
  pn532.SAMConfig();
  Serial.println("Ready. Present NTAG216 tag.");
  initialized = true;
}

// ---- I2C bus recovery ------------------------------------------------------

#if !TRYLLESTAV_PN532_USE_SPI

// If the PN532 was mid-transaction when the ESP8266 last reset, it may be
// holding SDA low, making the bus unusable. We detect this by reading SDA
// after releasing both lines as inputs. If SDA is low, we clock SCL up to
// 9 times (enough to flush any in-progress byte) until SDA is released,
// then send an I2C STOP condition to return the bus to idle.
// Returns true if the unstick procedure ran (SDA was held low).
// Wire.begin() must be called after this.
bool unstickI2cBusIfNeeded() {
  pinMode(kI2cSdaPin, INPUT_PULLUP);
  pinMode(kI2cSclPin, INPUT_PULLUP);
  delayMicroseconds(10);
  if (digitalRead(kI2cSdaPin)) return false;  // bus free, nothing to do

  Serial.println("SDA held low - clocking SCL to release stuck slave...");
  pinMode(kI2cSclPin, OUTPUT);
  for (uint8_t i = 0; i < 9; i++) {
    digitalWrite(kI2cSclPin, LOW);
    delayMicroseconds(10);
    digitalWrite(kI2cSclPin, HIGH);
    delayMicroseconds(10);
    if (digitalRead(kI2cSdaPin)) break;
  }
  // Generate STOP: SDA low -> high while SCL is high.
  pinMode(kI2cSdaPin, OUTPUT);
  digitalWrite(kI2cSdaPin, LOW);
  delayMicroseconds(10);
  digitalWrite(kI2cSdaPin, HIGH);
  delayMicroseconds(10);
  // Release pins so Wire.begin() can reclaim them.
  pinMode(kI2cSdaPin, INPUT_PULLUP);
  pinMode(kI2cSclPin, INPUT_PULLUP);
  delayMicroseconds(10);
  return true;
}

// After a bus unstick the PN532 I2C slave layer is free, but the application
// layer may still have a response frame buffered (the one that was being sent
// when the ESP8266 last reset). In that state the PN532 ignores new commands
// until the buffered response is consumed. We detect this by reading the
// single-byte status register: bit 0 = 1 means data ready. If set, we read
// and discard the full frame so the chip returns to IDLE.
// Must be called after Wire.begin() and before pn532.begin().
void drainPn532IfReady() {
  Wire.requestFrom(kPn532I2cAddress, (uint8_t)1);
  if (!Wire.available()) return;
  if (!(Wire.read() & 0x01)) return;  // no pending data

  // GetFirmwareVersion response is ~14 bytes; read 20 to be safe.
  Serial.println("PN532 has buffered response - draining...");
  Wire.requestFrom(kPn532I2cAddress, (uint8_t)20);
  uint8_t count = 0;
  while (Wire.available()) { Wire.read(); count++; }
  Serial.print("Drained "); Serial.print(count); Serial.println(" bytes.");
  delay(50);
}

#endif  // !TRYLLESTAV_PN532_USE_SPI

// ---- setup / loop -----------------------------------------------------------

void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println();
  Serial.println("PN532 NTAG21x reader (D1 Mini)");
  Serial.print("Reset reason: ");
  Serial.println(ESP.getResetReason());

#if TRYLLESTAV_PN532_USE_SPI
  SPI.begin();
  Serial.println("Interface: SPI (SS=D8/GPIO15)");
#else
  Wire.begin(kI2cSdaPin, kI2cSclPin);
  Serial.print("Interface: I2C SDA="); Serial.print(kI2cSdaPin);
  Serial.print(" SCL="); Serial.println(kI2cSclPin);
#endif

  Serial.print("Settling "); Serial.print(kPn532BootDelayMs); Serial.println(" ms...");
  delay(kPn532BootDelayMs);

  pn532.begin();

  uint32_t versionData = pn532.getFirmwareVersion();
  if (!versionData) {
    Serial.println("PN532 not detected. Will retry every 2 s.");
    return;
  }

  configurePn532(versionData);
}

void loop() {
  // If setup() did not detect PN532, keep retrying every 2 s.
  if (!initialized) {
    const uint32_t now = millis();
    if (now - lastRetryAt >= 2000) {
      lastRetryAt = now;
#if !TRYLLESTAV_PN532_USE_SPI
      // 1. Release any stuck SDA via raw GPIO (no Wire involvement).
      unstickI2cBusIfNeeded();
      // 2. Reinitialise the ESP8266 I2C driver.
      Wire.begin(kI2cSdaPin, kI2cSclPin);
      // 3. Drain any buffered response the PN532 app layer was holding from
      //    before the reset. Without this, the PN532 ignores new commands
      //    until the old frame is consumed.
      drainPn532IfReady();
#endif
      pn532.begin();
      uint32_t versionData = pn532.getFirmwareVersion();
      if (versionData) {
        configurePn532(versionData);
      } else {
        Serial.println("PN532 still not detected, retrying...");
      }
    }
    yield();
    delay(50);
    return;
  }

  uint8_t uid[7] = {0};
  uint8_t uidLength = 0;

  bool found = pn532.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength);
  if (!found) {
    yield();
    delay(kPollIntervalMs);
    return;
  }

  const uint32_t now = millis();
  if (sameUid(uid, uidLength) && (now - lastSeenAt) < kReadDebounceMs) {
    delay(kPollIntervalMs);
    return;
  }

  Serial.println();
  Serial.print("Tag UID("); Serial.print(uidLength); Serial.print("): ");
  printUid(uid, uidLength);
  Serial.println();

  if (uidLength != 7) {
    Serial.println("Not NTAG21x/Ultralight (UID != 7 bytes), skipping page dump.");
    rememberUid(uid, uidLength);
    delay(kPollIntervalMs);
    return;
  }

  dumpNtagPages();
  rememberUid(uid, uidLength);

  delay(kPollIntervalMs);
}
