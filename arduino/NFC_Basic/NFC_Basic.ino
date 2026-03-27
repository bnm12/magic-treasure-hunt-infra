#include <Wire.h>
#include <PN532_I2C.h>
#include <PN532.h>

// Wemos D1 Mini I2C defaults:
// D1 (GPIO5) -> SCL
// D2 (GPIO4) -> SDA
// 3V3 -> VCC
// GND -> GND
// PN532 in I2C mode (DIP/jumper on module)

// Keep retries very high so reads are more tolerant for tiny glass tags.
constexpr uint8_t kPassiveActivationRetries = 0xFF;
constexpr uint16_t kPollIntervalMs = 25;
constexpr uint16_t kReadDebounceMs = 350;

// Pages read for quick diagnostics: header + first user pages.
constexpr uint8_t kReadStartPage = 0;
constexpr uint8_t kReadEndPage = 15;

PN532_I2C pn532I2c(Wire);
PN532 pn532(pn532I2c);

uint8_t lastUid[7] = {0};
uint8_t lastUidLength = 0;
uint32_t lastSeenAt = 0;

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
    if (readAndPrintPage(page, data) && page == 3) {
      for (uint8_t i = 0; i < 4; i++) {
        ccPage[i] = data[i];
      }
      ccRead = true;
    }
  }

  if (ccRead) {
    printTagGuessFromCc(ccPage);
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println();
  Serial.println("PN532 NTAG21x diagnostic reader (D1 Mini)");

  Wire.begin();
  pn532.begin();

  uint32_t versionData = pn532.getFirmwareVersion();
  if (!versionData) {
    Serial.println("PN532 not detected. Check wiring and module mode (I2C).");
    while (true) {
      delay(1000);
    }
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
}

void loop() {
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

  dumpBasicNtagPages();
  rememberUid(uid, uidLength);

  delay(kPollIntervalMs);
}
