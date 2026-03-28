#include <Wire.h>
#include <PN532_I2C.h>
#include <PN532.h>
#include <NdefMessage.h>
#include <NdefRecord.h>
#include <MifareUltralight.h>

// Wemos D1 Mini I2C wiring:
// D2 (GPIO4) -> SDA
// D1 (GPIO5) -> SCL
// 3V3 -> VCC
// GND -> GND

// Spot configuration for this board (configurable via serial).
uint8_t spotId = 3;
uint16_t huntYear = 2026;
const char kHuntMimePrefix[] = "x-hunt:";
const char kWandMetaMimeType[] = "x-hunt-meta";

String serialBuffer;
constexpr uint8_t kI2cSdaPin = 4;
constexpr uint8_t kI2cSclPin = 5;
constexpr uint8_t kPn532I2cAddress = 0x24;  // 7-bit address

constexpr uint16_t kPn532BootDelayMs = 2000;  // Extra time for 3.3V regulator and PN532 module to stabilize
constexpr uint16_t kRetryIntervalMs = 2000;
constexpr uint8_t kPassiveActivationRetries = 0x20;  // ESP8266 watchdog safe
constexpr uint16_t kCiuRfCfgRegister = 0x6316;

constexpr uint16_t kPollIntervalMs = 50;
constexpr uint16_t kReadDebounceMs = 400;
constexpr uint8_t kCcPage = 3;
constexpr uint8_t kUserStartPage = 4;
constexpr size_t kMaxUserAreaBytes = 888;

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

bool readPage(uint8_t page, uint8_t* data) {
  // Try twice to handle transient RF coupling issues.
  if (pn532.mifareultralight_ReadPage(page, data)) return true;
  delay(10);
  return pn532.mifareultralight_ReadPage(page, data);
}

bool readCcPageStable(uint8_t* ccOut) {
  uint8_t ccA[4] = {0};
  uint8_t ccB[4] = {0};

  if (!readPage(kCcPage, ccA)) return false;
  delay(10);
  if (!readPage(kCcPage, ccB)) return false;

  // Require two consecutive matching CC reads before allowing writes.
  if (memcmp(ccA, ccB, sizeof(ccA)) != 0) return false;
  memcpy(ccOut, ccA, sizeof(ccA));
  return true;
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

  // Keep RF field enabled via official API.
  if (pn532.setRFField(0x00, 0x01)) {
    Serial.println("RF field enabled.");
  } else {
    Serial.println("WARNING: Failed to enable RF field.");
  }

  // Raise receiver gain (CIU_RFCfg RxGain bits [6:4]) to maximum (0b111).
  // This improves tag detect/read sensitivity but does not increase antenna TX power.
  uint32_t rfCfg = pn532.readRegister(kCiuRfCfgRegister);
  uint8_t rfCfgByte = (uint8_t)(rfCfg & 0xFF);
  uint8_t boosted = (uint8_t)((rfCfgByte & 0x8F) | 0x70);
  if (pn532.writeRegister(kCiuRfCfgRegister, boosted)) {
    Serial.print("RX gain boosted: 0x");
    printHexByte(rfCfgByte);
    Serial.print(" -> 0x");
    printHexByte(boosted);
    Serial.println();
  } else {
    Serial.println("WARNING: Failed to boost RX gain.");
  }
  
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
  snprintf(out, outSize, "x-hunt:%u", (unsigned)huntYear);
}

void printHuntPayload(const uint8_t* payload) {
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
}

void setSpotBit(uint8_t* payload, uint8_t id) {
  // Spot N → bit (N-1) in 64-bit big-endian bitmask.
  // Byte 7 = LSB (spots 1-8), byte 6 (spots 9-16), ..., byte 0 = MSB (spots 57-64)
  const uint8_t bitIndex = id - 1;
  const uint8_t byteIndex = 7 - (bitIndex / 8);
  const uint8_t bitInByte = bitIndex % 8;
  payload[byteIndex] |= (uint8_t)(1u << bitInByte);
}

bool findNdefTlv(const uint8_t* data, size_t dataLen, size_t* valueOffset, size_t* valueLen) {
  size_t i = 0;
  while (i < dataLen) {
    const uint8_t t = data[i++];
    if (t == 0x00) continue;
    if (t == 0xFE) return false;
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
    if (t == 0x03) { *valueOffset = i; *valueLen = len; return true; }
    i += len;
  }
  return false;
}

bool readRawNdefFromTag(uint8_t* outMessage, size_t outCap, size_t* outLen) {
  uint8_t cc[4] = {0};
  if (!readCcPageStable(cc)) {
    Serial.println("Failed to read CC page.");
    return false;
  }

  const size_t userCapacityBytes = (size_t)cc[2] * 8;
  if (userCapacityBytes == 0 || userCapacityBytes > kMaxUserAreaBytes) {
    Serial.println("Unsupported tag capacity.");
    return false;
  }

  static uint8_t rawBuf[kMaxUserAreaBytes];
  memset(rawBuf, 0, sizeof(rawBuf));

  size_t rawLen = 0;
  const size_t pagesToRead = (userCapacityBytes + 3) / 4;
  for (size_t i = 0; i < pagesToRead; i++) {
    uint8_t pageData[4] = {0};
    if (!readPage((uint8_t)(kUserStartPage + i), pageData)) {
      Serial.print("Read failed at page ");
      Serial.println((unsigned)(kUserStartPage + i));
      break;
    }

    memcpy(rawBuf + rawLen, pageData, 4);
    rawLen += 4;

    size_t ndefOff = 0;
    size_t ndefLen = 0;
    if (findNdefTlv(rawBuf, rawLen, &ndefOff, &ndefLen) && ndefOff + ndefLen <= rawLen) {
      if (ndefLen > outCap) {
        Serial.println("NDEF message too large for buffer.");
        return false;
      }
      memcpy(outMessage, rawBuf + ndefOff, ndefLen);
      *outLen = ndefLen;
      return true;
    }

    yield();
  }

  return false;
}

bool probeBlankUserArea(bool* isBlank) {
  if (!isBlank) return false;
  *isBlank = true;

  // Only probe the first user pages. If any non-zero byte exists, treat as non-blank.
  // A blank tag can safely be initialized; a non-blank unreadable tag must not be overwritten.
  constexpr uint8_t kProbePages = 4;
  for (uint8_t i = 0; i < kProbePages; i++) {
    uint8_t pageData[4] = {0};
    if (!readPage((uint8_t)(kUserStartPage + i), pageData)) {
      return false;
    }
    for (uint8_t b = 0; b < 4; b++) {
      if (pageData[b] != 0x00) {
        *isBlank = false;
        return true;
      }
    }
  }

  return true;
}

// Parse wand metadata from payload buffer.
// Returns true if payload is valid (>=3 bytes, name length matches payload length).
bool parseWandMetadataPayload(const uint8_t* payload, size_t payloadLen, uint16_t* outYear, String* outName) {
  if (!payload || payloadLen < 3) return false;
  
  // Big-endian year from first 2 bytes
  *outYear = ((uint16_t)payload[0] << 8) | payload[1];
  
  uint8_t nameLen = payload[2];
  if (3 + nameLen != payloadLen) return false;  // Strict: payload size must match exactly
  
  *outName = "";
  for (uint8_t i = 0; i < nameLen; i++) {
    *outName += (char)payload[3 + i];
  }
  
  return true;
}

// Check if a parsed NDEF message contains a valid wand metadata record.
// Returns true if found and valid; outYear and outName are populated on success.
bool hasValidWandMetadata(NdefMessage& msg, uint16_t* outYear, String* outName) {
  if (!outYear || !outName) return false;
  
  for (int i = 0; i < (int)msg.getRecordCount(); i++) {
    NdefRecord r = msg.getRecord(i);
    if (r.getTnf() == TNF_MIME_MEDIA) {
      String recType = r.getType();
      if (recType == String(kWandMetaMimeType)) {
        uint8_t payload[256] = {0};
        size_t payloadLen = r.getPayloadLength();
        if (payloadLen > sizeof(payload)) return false;
        r.getPayload(payload);
        
        uint16_t year = 0;
        if (!parseWandMetadataPayload(payload, payloadLen, &year, outName)) return false;
        *outYear = year;
        return true;
      }
    }
  }
  
  return false;
}

bool writeSpotToTag(uint8_t* uid, uint8_t uidLength) {
  if (spotId < 1 || spotId > 64) {
    Serial.println("spotId must be in range 1..64.");
    return false;
  }

  char mimeType[64] = {0};
  buildHuntMimeType(mimeType, sizeof(mimeType));

  // Preflight: only write when CC reads are stable.
  uint8_t ccCheck[4] = {0};
  if (!readCcPageStable(ccCheck)) {
    Serial.println("Tag coupling unstable (CC read mismatch/fail); skipping write.");
    return false;
  }

  static uint8_t existingNdef[kMaxUserAreaBytes];
  size_t existingNdefLen = 0;
  const bool hasExistingNdef = readRawNdefFromTag(existingNdef, sizeof(existingNdef), &existingNdefLen);

  if (!hasExistingNdef) {
    bool isBlank = false;
    if (!probeBlankUserArea(&isBlank)) {
      Serial.println("Could not safely verify tag blank state; refusing write.");
      return false;
    }
    if (!isBlank) {
      Serial.println("Existing tag data is unreadable; refusing write to avoid data loss.");
      return false;
    }
    Serial.println("ERROR: Blank tag detected; missing wand metadata (x-hunt-meta). Refusing write.");
    return false;
  }

  // Parse existing records to preserve URI and other-year hunt data.
  // Copy to a 4-byte aligned static buffer first to avoid Xtensa alignment faults
  // that crash the NdefMessage constructor when given an unaligned pointer.
  NdefRecord uriRecord;
  bool hasUri = false;
  NdefRecord metaRecord;
  bool hasMeta = false;
  String otherYearMimeTypes[MAX_NDEF_RECORDS];
  uint8_t otherYearPayloads[MAX_NDEF_RECORDS][8] = {{0}};
  int otherYearCount = 0;
  uint8_t huntPayload[8] = {0};

  if (hasExistingNdef && existingNdefLen > 0) {
    NdefMessage existingMsg(existingNdef, (int)existingNdefLen);
    
    // Gate spot writes: tag must have valid wand metadata record.
    uint16_t metaYear = 0;
    String metaName = "";
    if (!hasValidWandMetadata(existingMsg, &metaYear, &metaName)) {
      Serial.println("ERROR: Tag does not have valid wand metadata. Not an official wand.");
      Serial.println("Initialize wands in website Toybox (writes x-hunt-meta), then retry.");
      return false;
    }
    Serial.print("Owner verified: '");
    Serial.print(metaName);
    Serial.print("' (created ");
    Serial.print(metaYear);
    Serial.println(")");
    
    for (int i = 0; i < (int)existingMsg.getRecordCount(); i++) {
      NdefRecord r = existingMsg.getRecord(i);
      if (r.getTnf() == TNF_WELL_KNOWN && r.getType() == "U") {
        hasUri = true;
        uriRecord = r;
      } else if (r.getTnf() == TNF_MIME_MEDIA) {
        String recType = r.getType();
        if (recType == String(kWandMetaMimeType)) {
          hasMeta = true;
          metaRecord = r;
        } else if (r.getPayloadLength() == 8 && recType == String(mimeType)) {
          r.getPayload(huntPayload);
        } else if (r.getPayloadLength() == 8 && recType.startsWith(String(kHuntMimePrefix)) && otherYearCount < MAX_NDEF_RECORDS) {
          otherYearMimeTypes[otherYearCount] = recType;
          r.getPayload(otherYearPayloads[otherYearCount]);
          otherYearCount++;
        }
      }
    }
  }

  // Build a clean message: URI first, other valid hunt-year records, then current year.
  // This intentionally drops unknown/malformed records to self-heal tags written in bad states.
  NdefMessage outMsg;
  if (hasUri) {
    outMsg.addRecord(uriRecord);
  }
  if (hasMeta) {
    outMsg.addRecord(metaRecord);
  }
  for (int i = 0; i < otherYearCount; i++) {
    outMsg.addMimeMediaRecord(otherYearMimeTypes[i], otherYearPayloads[i], 8);
  }
  setSpotBit(huntPayload, spotId);
  outMsg.addMimeMediaRecord(String(mimeType), huntPayload, 8);

  // Use the library only for writing — it handles TLV wrapping and page writes correctly.
  MifareUltralight ul(pn532);
  if (!ul.write(outMsg, uid, uidLength)) {
    Serial.println("Failed to write NDEF message.");
    return false;
  }

  // Verify write by re-reading raw NDEF TLV before reporting success.
  static uint8_t verifyNdef[kMaxUserAreaBytes];
  size_t verifyNdefLen = 0;
  if (!readRawNdefFromTag(verifyNdef, sizeof(verifyNdef), &verifyNdefLen)) {
    Serial.println("WARNING: Write completed but NDEF readback failed.");
    return false;
  }

  Serial.print("NDEF readback length: ");
  Serial.print((unsigned)verifyNdefLen);
  Serial.println(" bytes");

  NdefMessage verifyMsg(verifyNdef, (int)verifyNdefLen);
  Serial.print("NDEF records: ");
  Serial.println((unsigned)verifyMsg.getRecordCount());
  for (int i = 0; i < (int)verifyMsg.getRecordCount(); i++) {
    NdefRecord vr = verifyMsg.getRecord(i);
    Serial.print("  #");
    Serial.print(i + 1);
    Serial.print(" TNF=");
    Serial.print((unsigned)vr.getTnf());
    Serial.print(" Type=");
    Serial.print(vr.getType());
    Serial.print(" PayloadLen=");
    Serial.println(vr.getPayloadLength());
  }

  Serial.print("SUCCESS: spot ");
  Serial.print(spotId);
  Serial.print(" written to year ");
  Serial.println(huntYear);
  printHuntPayload(huntPayload);
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
  
  Serial.println("Commands:");
  Serial.println("  'setSpot: X' (1-64)");
  Serial.println("  'setYear: YYYY' (2000-2100)");
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

  writeSpotToTag(uid, uidLength);
  rememberUid(uid, uidLength);
  delay(kPollIntervalMs);
}
