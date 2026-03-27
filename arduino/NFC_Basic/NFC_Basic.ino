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

constexpr uint8_t kI2cSdaPin = 4;
constexpr uint8_t kI2cSclPin = 5;
constexpr uint8_t kPn532Expected7BitAddress = 0x24;
constexpr uint8_t kSpiSsPin = 15;
constexpr uint16_t kPn532BootDelayMs = 250;
constexpr uint8_t kPn532InitCycles = 3;
constexpr uint8_t kFirmwareProbeAttempts = 5;
constexpr uint16_t kFirmwareProbeDelayMs = 250;
constexpr uint32_t kInitRetryIntervalMs = 1500;

// On ESP8266, 0xFF can block long enough to trigger watchdog resets.
constexpr uint8_t kPassiveActivationRetries = 0x20;
constexpr uint16_t kPollIntervalMs = 25;
constexpr uint16_t kReadDebounceMs = 350;

// Pages read for quick diagnostics: header + first user pages.
constexpr uint8_t kReadStartPage = 0;
constexpr uint8_t kReadEndPage = 15;

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
bool pn532Ready = false;
uint32_t lastInitAttemptAt = 0;

bool isLikelyNtagUidLength(uint8_t uidLength) {
  return uidLength == 7;
}

#if !TRYLLESTAV_PN532_USE_SPI
void recoverI2cBus() {
  // Release a potentially stuck slave by clocking SCL while SDA is pulled high.
  pinMode(kI2cSdaPin, INPUT_PULLUP);
  pinMode(kI2cSclPin, INPUT_PULLUP);
  delay(2);

  if (digitalRead(kI2cSdaPin) == HIGH) {
    return;
  }

  Serial.println("I2C SDA low, attempting bus recovery pulses...");
  pinMode(kI2cSclPin, OUTPUT);
  for (uint8_t i = 0; i < 16; i++) {
    digitalWrite(kI2cSclPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(kI2cSclPin, LOW);
    delayMicroseconds(10);
  }

  // Try to create a STOP condition.
  pinMode(kI2cSdaPin, OUTPUT);
  digitalWrite(kI2cSdaPin, LOW);
  delayMicroseconds(10);
  digitalWrite(kI2cSclPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(kI2cSdaPin, HIGH);
  delayMicroseconds(10);

  pinMode(kI2cSdaPin, INPUT_PULLUP);
  pinMode(kI2cSclPin, INPUT_PULLUP);
}

void reinitI2cBus() {
  recoverI2cBus();
  Wire.begin(kI2cSdaPin, kI2cSclPin);
  delay(2);
}
#endif

void printAddressLabel(uint8_t address) {
  Serial.print("0x");
  printHexByte(address);
}

void scanI2cBus() {
#if TRYLLESTAV_PN532_USE_SPI
  Serial.println("Skipping I2C scan because SPI mode is enabled.");
#else
  bool foundAnyDevice = false;

  Serial.println("Scanning I2C bus...");
  for (uint8_t address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    const uint8_t error = Wire.endTransmission();

    if (error == 0) {
      foundAnyDevice = true;
      Serial.print("  device at ");
      printAddressLabel(address);
      if (address == kPn532Expected7BitAddress) {
        Serial.print(" (expected PN532 7-bit I2C address)");
      }
      Serial.println();
    }
  }

  if (!foundAnyDevice) {
    Serial.println("  no I2C devices responded");
  }
#endif
}

uint32_t detectPn532FirmwareVersion() {
  uint32_t versionData = 0;

  for (uint8_t attempt = 1; attempt <= kFirmwareProbeAttempts; attempt++) {
    versionData = pn532.getFirmwareVersion();
    if (versionData != 0) {
      if (attempt > 1) {
        Serial.print("PN532 responded on retry ");
        Serial.println(attempt);
      }
      return versionData;
    }

    Serial.print("PN532 firmware probe failed, retry ");
    Serial.print(attempt);
    Serial.print("/");
    Serial.println(kFirmwareProbeAttempts);
    yield();
    delay(kFirmwareProbeDelayMs);
  }

  return 0;
}

void printHexByte(uint8_t value) {
  if (value < 0x10) {
    Serial.print('0');
  }
  Serial.print(value, HEX);
}

void printUid(const uint8_t* uid, uint8_t uidLength) {
  for (uint8_t i = 0; i < uidLength; i++) {
    printHexByte(uid[i]);
    if (i + 1 < uidLength) {
      Serial.print(':');
    }
  }
}

bool sameUid(const uint8_t* uid, uint8_t uidLength) {
  if (uidLength != lastUidLength) {
    return false;
  }

  for (uint8_t i = 0; i < uidLength; i++) {
    if (uid[i] != lastUid[i]) {
      return false;
    }
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

bool readAndPrintPage(uint8_t page, uint8_t* data) {
  if (!pn532.mifareultralight_ReadPage(page, data)) {
    Serial.print("  page ");
    Serial.print(page);
    Serial.println(": read failed");
    return false;
  }

  Serial.print("  page ");
  Serial.print(page);
  Serial.print(": ");
  for (uint8_t i = 0; i < 4; i++) {
    printHexByte(data[i]);
    if (i < 3) {
      Serial.print(' ');
    }
  }
  Serial.println();
  return true;
}

void printTagGuessFromCc(const uint8_t* ccPage) {
  // CC lives at page 3 on NTAG21x: E1 10 <size> 00
  if (ccPage[0] != 0xE1) {
    Serial.println("  CC byte 0 is not E1, tag may not be NTAG21x/NDEF formatted.");
    return;
  }

  Serial.print("  CC size byte: 0x");
  printHexByte(ccPage[2]);
  Serial.println();

  if (ccPage[2] == 0x6D) {
    Serial.println("  Tag profile guess: NTAG216 (high confidence)");
  } else if (ccPage[2] == 0x3E) {
    Serial.println("  Tag profile guess: NTAG215");
  } else if (ccPage[2] == 0x12) {
    Serial.println("  Tag profile guess: NTAG213");
  } else {
    Serial.println("  Tag profile guess: unknown NTAG variant");
  }
}

void dumpBasicNtagPages() {
  uint8_t data[4] = {0};
  uint8_t ccPage[4] = {0};
  bool ccRead = false;

  Serial.print("Reading pages ");
  Serial.print(kReadStartPage);
  Serial.print("..");
  Serial.println(kReadEndPage);

  for (uint8_t page = kReadStartPage; page <= kReadEndPage; page++) {
    if (!readAndPrintPage(page, data)) {
      if (page == kReadStartPage) {
        Serial.println("Aborting page dump after first read failure.");
        return;
      }
      break;
    }

    if (page == 3) {
      for (uint8_t i = 0; i < 4; i++) {
        ccPage[i] = data[i];
      }
      ccRead = true;
    }
    yield();
  }

  if (ccRead) {
    printTagGuessFromCc(ccPage);
  }
}

bool initializePn532(bool verboseFailure) {
  uint32_t versionData = 0;

#if TRYLLESTAV_PN532_USE_SPI
  pn532.begin();
  versionData = detectPn532FirmwareVersion();
#else
  for (uint8_t cycle = 1; cycle <= kPn532InitCycles; cycle++) {
    if (cycle > 1) {
      Serial.print("PN532 init recovery cycle ");
      Serial.print(cycle);
      Serial.print("/");
      Serial.println(kPn532InitCycles);
      reinitI2cBus();
      delay(25);
    }

    pn532.begin();
    versionData = detectPn532FirmwareVersion();
    if (versionData) {
      break;
    }
  }
#endif

  if (!versionData) {
    if (verboseFailure) {
      Serial.println("PN532 not detected on selected interface.");
#if TRYLLESTAV_PN532_USE_SPI
      Serial.println("Check SPI wiring and switch the PN532 module to SPI mode.");
      Serial.println("  1. PN532 SCK -> D5, MISO -> D6, MOSI -> D7, SS -> D8.");
      Serial.println("  2. Shared ground is present and module power is stable.");
      Serial.println("  3. PN532 mode selector is set for SPI, not I2C or HSU.");
#else
      scanI2cBus();
      Serial.println("Check these before trying RC522:");
      Serial.println("  1. PN532 module is in I2C mode, not SPI or HSU.");
      Serial.println("  2. D1 Mini D2(GPIO4) -> SDA and D1(GPIO5) -> SCL.");
      Serial.println("  3. Shared ground is present and module power is stable.");
      Serial.println("  4. Module appears on I2C scan after PN532 wakeup attempt (expected 0x24).");
#endif
    }
    return false;
  }

  Serial.print("PN532 FW chip: PN5");
  Serial.print((versionData >> 24) & 0xFF, HEX);
  Serial.print(" | firmware ");
  Serial.print((versionData >> 16) & 0xFF, DEC);
  Serial.print('.');
  Serial.println((versionData >> 8) & 0xFF, DEC);

  pn532.setPassiveActivationRetries(kPassiveActivationRetries);
  pn532.SAMConfig();

  Serial.println("Ready. Bring NTAG216 close to antenna for repeated scans.");
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println();
  Serial.println("PN532 NTAG21x diagnostic reader (D1 Mini)");
  Serial.print("Reset reason: ");
  Serial.println(ESP.getResetReason());

#if TRYLLESTAV_PN532_USE_SPI
  SPI.begin();
  Serial.print("SPI mode enabled. SS pin=");
  Serial.print(kSpiSsPin);
  Serial.println(" (D8 / GPIO15)");
  Serial.println("Expected SPI wiring: SCK=D5, MISO=D6, MOSI=D7, SS=D8");
#else
  reinitI2cBus();
  Serial.print("I2C pins SDA=");
  Serial.print(kI2cSdaPin);
  Serial.print(" SCL=");
  Serial.print(kI2cSclPin);
  Serial.println(" (explicit Wire setup + recovery)");
#endif

  Serial.print("Allowing PN532 boot time: ");
  Serial.print(kPn532BootDelayMs);
  Serial.println(" ms");
  delay(kPn532BootDelayMs);

  pn532Ready = initializePn532(true);
  lastInitAttemptAt = millis();
}

void loop() {
  if (!pn532Ready) {
    const uint32_t now = millis();
    if (now - lastInitAttemptAt >= kInitRetryIntervalMs) {
      Serial.println("PN532 not ready, retrying initialization...");
      pn532Ready = initializePn532(false);
      lastInitAttemptAt = now;
    }
    yield();
    delay(50);
    return;
  }

  uint8_t uid[7] = {0};
  uint8_t uidLength = 0;

  bool found = pn532.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength);
  if (!found) {
    delay(kPollIntervalMs);
    return;
  }

  const uint32_t now = millis();
  if (sameUid(uid, uidLength) && (now - lastSeenAt) < kReadDebounceMs) {
    delay(kPollIntervalMs);
    return;
  }

  Serial.println();
  Serial.print("Tag detected. UID(");
  Serial.print(uidLength);
  Serial.print("): ");
  printUid(uid, uidLength);
  Serial.println();

  if (!isLikelyNtagUidLength(uidLength)) {
    Serial.println("Tag is not NTAG21x/Ultralight-style (UID length != 7), skipping page read dump.");
    rememberUid(uid, uidLength);
    delay(kPollIntervalMs);
    return;
  }

  dumpBasicNtagPages();
  rememberUid(uid, uidLength);

  delay(kPollIntervalMs);
}
