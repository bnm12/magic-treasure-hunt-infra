#include <Wire.h>
#include <PN532_I2C.h>
#include <PN532.h>
#include <ESP8266WiFi.h>

// Wemos D1 Mini I2C wiring:
// D2 (GPIO4) -> SDA
// D1 (GPIO5) -> SCL
// 3V3 -> VCC
// GND -> GND

constexpr uint8_t kI2cSdaPin = 4;
constexpr uint8_t kI2cSclPin = 5;
constexpr uint8_t kPn532I2cAddress = 0x24;  // 7-bit address

constexpr uint16_t kPn532BootDelayMs = 1200;
constexpr uint16_t kRetryIntervalMs = 2000;
constexpr uint8_t kPassiveActivationRetries = 0x20;  // ESP8266 watchdog safe

constexpr uint16_t kPollIntervalMs = 50;
constexpr uint16_t kReadDebounceMs = 400;
constexpr uint8_t kReadStartPage = 0;
constexpr uint8_t kReadEndPage = 15;

PN532_I2C pn532I2c(Wire);
PN532 pn532(pn532I2c);

uint8_t lastUid[7] = {0};
uint8_t lastUidLength = 0;
uint32_t lastSeenAt = 0;
uint32_t lastRetryAt = 0;
bool initialized = false;

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
  if (ccPage[0] != 0xE1) {
    Serial.println("  CC byte 0 != E1, tag may not be NTAG21x/NDEF formatted.");
    return;
  }

  Serial.print("  CC size byte: 0x");
  printHexByte(ccPage[2]);
  Serial.println();

  if (ccPage[2] == 0x6D) Serial.println("  Tag profile: NTAG216");
  else if (ccPage[2] == 0x3E) Serial.println("  Tag profile: NTAG215");
  else if (ccPage[2] == 0x12) Serial.println("  Tag profile: NTAG213");
  else Serial.println("  Tag profile: unknown NTAG variant");
}

void dumpNtagPages() {
  Serial.print("Reading pages ");
  Serial.print(kReadStartPage);
  Serial.print("..");
  Serial.println(kReadEndPage);

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

bool unstickI2cBusIfNeeded() {
  pinMode(kI2cSdaPin, INPUT_PULLUP);
  pinMode(kI2cSclPin, INPUT_PULLUP);
  delayMicroseconds(10);
  if (digitalRead(kI2cSdaPin)) return false;

  Serial.println("SDA held low - clocking SCL to release stuck slave...");
  pinMode(kI2cSclPin, OUTPUT);
  for (uint8_t i = 0; i < 9; i++) {
    digitalWrite(kI2cSclPin, LOW);
    delayMicroseconds(10);
    digitalWrite(kI2cSclPin, HIGH);
    delayMicroseconds(10);
    if (digitalRead(kI2cSdaPin)) break;
  }

  pinMode(kI2cSdaPin, OUTPUT);
  digitalWrite(kI2cSdaPin, LOW);
  delayMicroseconds(10);
  digitalWrite(kI2cSdaPin, HIGH);
  delayMicroseconds(10);

  pinMode(kI2cSdaPin, INPUT_PULLUP);
  pinMode(kI2cSclPin, INPUT_PULLUP);
  delayMicroseconds(10);
  return true;
}

void drainPn532IfReady() {
  Wire.requestFrom(kPn532I2cAddress, (uint8_t)1);
  if (!Wire.available()) return;
  if (!(Wire.read() & 0x01)) return;

  Serial.println("PN532 has buffered response - draining...");
  Wire.requestFrom(kPn532I2cAddress, (uint8_t)20);
  uint8_t count = 0;
  while (Wire.available()) {
    Wire.read();
    count++;
  }
  Serial.print("Drained ");
  Serial.print(count);
  Serial.println(" bytes.");
  delay(50);
}

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

bool tryInitPn532() {
  unstickI2cBusIfNeeded();
  Wire.begin(kI2cSdaPin, kI2cSclPin);
  drainPn532IfReady();

  pn532.begin();
  uint32_t versionData = pn532.getFirmwareVersion();
  if (!versionData) return false;

  configurePn532(versionData);
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println();
  Serial.println("PN532 NTAG21x reader (D1 Mini, I2C only)");
  Serial.print("Reset reason: ");
  Serial.println(ESP.getResetReason());

  Wire.begin(kI2cSdaPin, kI2cSclPin);
  Serial.print("Interface: I2C SDA=");
  Serial.print(kI2cSdaPin);
  Serial.print(" SCL=");
  Serial.println(kI2cSclPin);

  Serial.print("Settling ");
  Serial.print(kPn532BootDelayMs);
  Serial.println(" ms...");
  delay(kPn532BootDelayMs);

  if (!tryInitPn532()) {
    Serial.println("PN532 not detected. Will retry every 2 s.");
  }
}

void loop() {
  if (!initialized) {
    const uint32_t now = millis();
    if (now - lastRetryAt >= kRetryIntervalMs) {
      lastRetryAt = now;
      if (!tryInitPn532()) {
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
  Serial.print("Tag UID(");
  Serial.print(uidLength);
  Serial.print("): ");
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
