#include <Wire.h>
#include <PN532_I2C.h>
#include <PN532.h>

// Wemos D1 Mini I2C wiring:
// D2 (GPIO4) -> SDA
// D1 (GPIO5) -> SCL
// 3V3 -> VCC
// GND -> GND

// Spot configuration for this board (configurable via serial).
uint8_t spotId = 3;
uint16_t huntYear = 2026;
// Record 1: default wand link URL.
const char kDefaultWandUrl[] = "https://192.168.1.131:5173";

String serialBuffer;
constexpr uint8_t kI2cSdaPin = 4;
constexpr uint8_t kI2cSclPin = 5;
constexpr uint8_t kPn532I2cAddress = 0x24;  // 7-bit address

constexpr uint16_t kPn532BootDelayMs = 2000;  // Extra time for 3.3V regulator and PN532 module to stabilize
constexpr uint16_t kRetryIntervalMs = 2000;
constexpr uint8_t kPassiveActivationRetries = 0x20;  // ESP8266 watchdog safe

constexpr uint16_t kPollIntervalMs = 50;
constexpr uint16_t kReadDebounceMs = 400;
constexpr uint8_t kCcPage = 3;
constexpr uint8_t kUserStartPage = 4;

constexpr size_t kMaxTagDataBytes = 888;
constexpr size_t kMaxMessageBytes = 820;

PN532_I2C pn532I2c(Wire);
PN532 pn532(pn532I2c);

uint8_t lastUid[7] = {0};
uint8_t lastUidLength = 0;
uint32_t lastSeenAt = 0;
uint32_t lastRetryAt = 0;
bool initialized = false;

struct RecordView {
  size_t headerOffset;
  size_t payloadOffset;
  size_t payloadLength;
  size_t nextOffset;
  uint8_t header;
  bool valid;
};

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

bool readPage(uint8_t page, uint8_t* data) {
  // Try twice to handle transient RF coupling issues.
  if (pn532.mifareultralight_ReadPage(page, data)) return true;
  delay(10);
  return pn532.mifareultralight_ReadPage(page, data);
}

bool writePage(uint8_t page, const uint8_t* data) {
  return pn532.mifareultralight_WritePage(page, const_cast<uint8_t*>(data));
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
  for (uint8_t attempt = 0; attempt < 5; attempt++) {
    Wire.requestFrom(kPn532I2cAddress, (uint8_t)1);
    if (!Wire.available()) break;
    uint8_t status = Wire.read();
    if (!(status & 0x01)) break;  // No data ready

    Serial.println("PN532 has buffered response - draining...");
    Wire.requestFrom(kPn532I2cAddress, (uint8_t)32);
    while (Wire.available()) Wire.read();
    delay(50);
  }
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
  
  // Boost RF field power via direct I2C command.
  // PN532 RFConfiguration: Frame = [PreambleD4] [LEN] [LCS] [TFI] [CMD=0x32] [CFG_ITEM=0x01] [CFG_VALUE=0x01] [POSTAMBLE]
  // We send: 0x32 (RFConfiguration) 0x01 (RF Field) 0x01 (RF field ON)
  Wire.beginTransmission(kPn532I2cAddress);
  Wire.write(0x00);  // Frame header
  Wire.write(0x00);  
  Wire.write(0xFF);  // LEN marker for extended frame
  Wire.write(0x04);  // Actual length
  Wire.write(0xFC);  // Checksum (calculated for this specific command)
  Wire.write(0xD4);  // TFI (host to PN532)
  Wire.write(0x32);  // Command: RFConfiguration
  Wire.write(0x01);  // Config item: RF Field
  Wire.write(0x01);  // Value: RF field ON
  Wire.write(0xB9);  // DCS checksum
  Wire.write(0x00);  // Postamble
  Wire.endTransmission();
  delay(100);
  
  // Read response to clear buffer
  Wire.requestFrom(kPn532I2cAddress, (uint8_t)32);
  while (Wire.available()) Wire.read();
  
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

void buildHuntMimeType(char* out, size_t outSize) {
  snprintf(out, outSize, "application/vnd.tryllestav.hunt.year-%u", (unsigned)huntYear);
}

bool readUserAreaPrefix(uint8_t* out, size_t outCapacity, size_t* outReadBytes, size_t* outUserCapacityBytes) {
  uint8_t cc[4] = {0};
  if (!readPage(kCcPage, cc)) {
    Serial.println("Failed to read CC page.");
    return false;
  }

  const size_t userCapacityBytes = (size_t)cc[2] * 8;
  if (userCapacityBytes == 0 || userCapacityBytes > kMaxTagDataBytes) {
    Serial.println("Unsupported user area size.");
    return false;
  }
  *outUserCapacityBytes = userCapacityBytes;

  // Calculate max pages to read from CC declaration.
  const size_t pagesToReadFromCc = (userCapacityBytes + 3) / 4;
  const size_t maxReadableBytes = (userCapacityBytes < outCapacity) ? userCapacityBytes : outCapacity;
  const size_t pagesToRead = (maxReadableBytes + 3) / 4;
  
  if (pagesToRead == 0) {
    Serial.println("User area too small.");
    return false;
  }

  *outReadBytes = 0;
  for (size_t i = 0; i < pagesToRead; i++) {
    uint8_t pageData[4] = {0};
    if (!readPage((uint8_t)(kUserStartPage + i), pageData)) {
      Serial.print("Read failed at page ");
      Serial.println((unsigned)(kUserStartPage + i));
      return false;
    }
    memcpy(out + *outReadBytes, pageData, 4);
    *outReadBytes += 4;

    size_t ndefOffset = 0;
    size_t ndefLen = 0;
    if (findNdefTlv(out, *outReadBytes, &ndefOffset, &ndefLen)) {
      if (ndefOffset + ndefLen <= *outReadBytes) {
        return true;
      }
    }

    yield();
  }

  // If no complete NDEF was found, we still proceed and will create/update one.
  return true;
}

bool writeUserArea(const uint8_t* data, size_t dataBytes) {
  const size_t pageCount = (dataBytes + 3) / 4;
  for (size_t i = 0; i < pageCount; i++) {
    uint8_t pageData[4] = {0, 0, 0, 0};
    const size_t srcOffset = i * 4;
    const size_t copyCount = (srcOffset + 4 <= dataBytes) ? 4 : (dataBytes - srcOffset);
    if (copyCount > 0) memcpy(pageData, data + srcOffset, copyCount);

    if (!writePage((uint8_t)(kUserStartPage + i), pageData)) {
      Serial.print("Write failed at page ");
      Serial.println((unsigned)(kUserStartPage + i));
      return false;
    }
    yield();
  }
  return true;
}

size_t encodedNdefTlvLength(size_t messageLen) {
  return (messageLen < 0xFF) ? (2 + messageLen + 1) : (4 + messageLen + 1);
}

void printHuntPayload(const uint8_t* message, size_t messageLen, const char* mimeType) {
  size_t offset = 0;
  while (offset < messageLen) {
    RecordView r = parseRecord(message, messageLen, offset);
    if (!r.valid) return;

    if (typeMatchesMime(message, r, mimeType) && r.payloadLength == 8) {
      const uint8_t* payload = message + r.payloadOffset;

      Serial.print("  Payload (hex): ");
      for (uint8_t i = 0; i < 8; i++) {
        printHexByte(payload[i]);
        if (i < 7) Serial.print(" ");
      }
      Serial.println();

      Serial.print("  Payload (binary): ");
      for (uint8_t i = 0; i < 8; i++) {
        for (uint8_t b = 7; b < 8; --b) {
          Serial.print((payload[i] >> b) & 1);
        }
        if (i < 7) Serial.print(" ");
      }
      Serial.println();
      return;
    }

    offset = r.nextOffset;
  }
}

bool findNdefTlv(const uint8_t* data, size_t dataLen, size_t* valueOffset, size_t* valueLen) {
  size_t i = 0;
  while (i < dataLen) {
    const uint8_t t = data[i++];
    if (t == 0x00) continue;          // NULL TLV
    if (t == 0xFE) return false;      // Terminator
    if (i >= dataLen) return false;

    size_t len = 0;
    if (data[i] == 0xFF) {
      if (i + 2 >= dataLen) return false;
      len = ((size_t)data[i + 1] << 8) | data[i + 2];
      i += 3;
    } else {
      len = data[i++];
    }

    if (i + len > dataLen) return false;
    if (t == 0x03) {
      *valueOffset = i;
      *valueLen = len;
      return true;
    }

    i += len;
  }

  return false;
}

RecordView parseRecord(const uint8_t* msg, size_t msgLen, size_t offset) {
  RecordView r = {0, 0, 0, 0, 0, false};
  if (offset + 3 > msgLen) return r;

  const uint8_t header = msg[offset];
  const bool sr = (header & 0x10) != 0;
  const bool il = (header & 0x08) != 0;

  size_t p = offset + 1;
  const uint8_t typeLen = msg[p++];

  size_t payloadLen = 0;
  if (sr) {
    if (p >= msgLen) return r;
    payloadLen = msg[p++];
  } else {
    if (p + 4 > msgLen) return r;
    payloadLen = ((size_t)msg[p] << 24) | ((size_t)msg[p + 1] << 16) | ((size_t)msg[p + 2] << 8) | msg[p + 3];
    p += 4;
  }

  uint8_t idLen = 0;
  if (il) {
    if (p >= msgLen) return r;
    idLen = msg[p++];
  }

  if (p + typeLen + idLen + payloadLen > msgLen) return r;

  r.headerOffset = offset;
  r.payloadOffset = p + typeLen + idLen;
  r.payloadLength = payloadLen;
  r.nextOffset = r.payloadOffset + payloadLen;
  r.header = header;
  r.valid = true;
  return r;
}

bool typeMatchesMime(const uint8_t* msg, const RecordView& r, const char* mimeType) {
  const uint8_t header = r.header;
  const uint8_t tnf = header & 0x07;
  if (tnf != 0x02) return false;  // MIME media record

  const bool sr = (header & 0x10) != 0;
  const bool il = (header & 0x08) != 0;
  size_t p = r.headerOffset + 1;
  const uint8_t typeLen = msg[p++];
  if (sr) p += 1;
  else p += 4;
  if (il) p += 1;

  const size_t expectedLen = strlen(mimeType);
  if (typeLen != expectedLen) return false;
  return memcmp(msg + p, mimeType, expectedLen) == 0;
}

void setSpotBit(uint8_t* payload, uint8_t id) {
  // Spot N → bit (N-1) in 64-bit big-endian bitmask.
  // Byte 7 = LSB (spots 1-8), byte 6 (spots 9-16), ..., byte 0 = MSB (spots 57-64)
  const uint8_t bitIndex = id - 1;
  const uint8_t byteIndex = 7 - (bitIndex / 8);
  const uint8_t bitInByte = bitIndex % 8;
  payload[byteIndex] |= (uint8_t)(1u << bitInByte);
}

bool isSpotBitSet(const uint8_t* payload, uint8_t id) {
  const uint8_t bitIndex = id - 1;
  const uint8_t byteIndex = 7 - (bitIndex / 8);
  const uint8_t bitInByte = bitIndex % 8;
  return (payload[byteIndex] & (uint8_t)(1u << bitInByte)) != 0;
}

size_t buildHuntRecord(uint8_t* out, size_t outCap, const char* mimeType, uint8_t id) {
  const size_t typeLen = strlen(mimeType);
  const size_t recordLen = 1 + 1 + 1 + typeLen + 8;  // SR MIME record
  if (recordLen > outCap) return 0;

  size_t i = 0;
  out[i++] = 0xD2;              // MB=1, ME=1, SR=1, TNF=MIME
  out[i++] = (uint8_t)typeLen;
  out[i++] = 8;
  memcpy(out + i, mimeType, typeLen);
  i += typeLen;
  memset(out + i, 0, 8);
  setSpotBit(out + i, id);
  i += 8;
  return i;
}

bool upsertHuntRecord(uint8_t* message, size_t* messageLen, size_t messageCap, const char* mimeType, uint8_t id) {
  if (id < 1 || id > 64) {
    Serial.println("spotId must be in range 1..64.");
    return false;
  }

  if (*messageLen == 0) {
    size_t built = buildHuntRecord(message, messageCap, mimeType, id);
    if (!built) return false;
    *messageLen = built;
    return true;
  }

  size_t offset = 0;
  RecordView last = {0, 0, 0, 0, 0, false};
  while (offset < *messageLen) {
    RecordView r = parseRecord(message, *messageLen, offset);
    if (!r.valid) {
      Serial.println("NDEF parse failed while scanning records.");
      return false;
    }

    last = r;
    if (typeMatchesMime(message, r, mimeType) && r.payloadLength == 8) {
      if (!isSpotBitSet(message + r.payloadOffset, id)) {
        setSpotBit(message + r.payloadOffset, id);
      }
      return true;
    }

    offset = r.nextOffset;
  }

  uint8_t newRec[96] = {0};
  size_t newRecLen = buildHuntRecord(newRec, sizeof(newRec), mimeType, id);
  if (!newRecLen) return false;
  if (*messageLen + newRecLen > messageCap) return false;

  // Old last record is no longer ME.
  message[last.headerOffset] &= 0xBF;
  // New record is not MB when appended.
  newRec[0] &= 0x7F;

  memcpy(message + *messageLen, newRec, newRecLen);
  *messageLen += newRecLen;
  return true;
}

bool buildAndWriteNdef(uint8_t* userArea, size_t userAreaBytes, uint8_t* message, size_t messageLen) {
  uint8_t out[kMaxTagDataBytes] = {0};
  size_t o = 0;

  out[o++] = 0x03;  // NDEF TLV
  if (messageLen < 0xFF) {
    out[o++] = (uint8_t)messageLen;
  } else {
    out[o++] = 0xFF;
    out[o++] = (uint8_t)((messageLen >> 8) & 0xFF);
    out[o++] = (uint8_t)(messageLen & 0xFF);
  }

  if (o + messageLen + 1 > userAreaBytes || o + messageLen + 1 > sizeof(out)) {
    Serial.println("NDEF payload does not fit in tag user area.");
    return false;
  }

  memcpy(out + o, message, messageLen);
  o += messageLen;
  out[o++] = 0xFE;  // Terminator TLV

  const size_t writeBytes = encodedNdefTlvLength(messageLen);
  memcpy(userArea, out, writeBytes);
  return writeUserArea(userArea, writeBytes);
}

bool writeSpotToTag() {
  uint8_t userArea[kMaxTagDataBytes] = {0};
  size_t readBytes = 0;
  size_t userAreaBytes = 0;
  if (!readUserAreaPrefix(userArea, sizeof(userArea), &readBytes, &userAreaBytes)) return false;

  char mimeType[64] = {0};
  buildHuntMimeType(mimeType, sizeof(mimeType));

  uint8_t message[kMaxMessageBytes] = {0};
  size_t messageLen = 0;

  size_t ndefOffset = 0;
  size_t ndefLen = 0;
  if (findNdefTlv(userArea, readBytes, &ndefOffset, &ndefLen)) {
    if (ndefLen > sizeof(message)) {
      Serial.println("Existing NDEF message is too large for demo buffer.");
      return false;
    }
    memcpy(message, userArea + ndefOffset, ndefLen);
    messageLen = ndefLen;
  }

  if (!upsertHuntRecord(message, &messageLen, sizeof(message), mimeType, spotId)) {
    Serial.println("Failed to update hunt record.");
    return false;
  }

  if (!buildAndWriteNdef(userArea, userAreaBytes, message, messageLen)) {
    Serial.println("Failed to write NDEF message.");
    return false;
  }

  Serial.print("SUCCESS: spot ");
  Serial.print(spotId);
  Serial.print(" written to year ");
  Serial.println(huntYear);
  printHuntPayload(message, messageLen, mimeType);
  return true;
}

void handleSerialInput() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      if (serialBuffer.length() > 0) {
        processSerialCommand(serialBuffer);
        serialBuffer = "";
      }
    } else if (serialBuffer.length() < 50) {
      serialBuffer += c;
    }
  }
}

void processSerialCommand(const String& cmd) {
  String trimmed = cmd;
  trimmed.trim();
  
  if (trimmed.startsWith("setSpot:")) {
    String valStr = trimmed.substring(8);
    valStr.trim();
    uint8_t val = valStr.toInt();
    if (val >= 1 && val <= 64) {
      spotId = val;
      Serial.print("OK: spotId = ");
      Serial.println(spotId);
    } else {
      Serial.println("ERROR: spot must be 1-64");
    }
    return;
  }
  
  if (trimmed.startsWith("setYear:")) {
    String valStr = trimmed.substring(8);
    valStr.trim();
    uint16_t val = valStr.toInt();
    if (val >= 2000 && val <= 2100) {
      huntYear = val;
      Serial.print("OK: huntYear = ");
      Serial.println(huntYear);
    } else {
      Serial.println("ERROR: year must be 2000-2100");
    }
    return;
  }
  
  Serial.println("Commands: 'setSpot: X' (1-64) or 'setYear: YYYY' (2000-2100)");
}

void setup() {
  Serial.begin(115200);
  delay(200);

  Serial.println();
  Serial.println("PN532 spot writer (D1 Mini, I2C only)");

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
    return;
  }

  Serial.print("Configured spotId=");
  Serial.print(spotId);
  Serial.print(" huntYear=");
  Serial.println(huntYear);
}

void loop() {
  handleSerialInput();

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
    Serial.println("Not NTAG21x/Ultralight (UID != 7 bytes), skipping write.");
    rememberUid(uid, uidLength);
    delay(kPollIntervalMs);
    return;
  }

  writeSpotToTag();
  rememberUid(uid, uidLength);
  delay(kPollIntervalMs);
}
