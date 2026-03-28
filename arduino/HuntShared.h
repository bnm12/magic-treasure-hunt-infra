#ifndef HUNT_SHARED_H
#define HUNT_SHARED_H

#include <Arduino.h>
#include <EEPROM.h>
#include <NdefMessage.h>
#include <NdefRecord.h>

// EEPROM settings
#define EEPROM_SIZE 512
#define EEPROM_MAGIC 0x42
#define ADDR_SPOT_ID 0
#define ADDR_HUNT_YEAR 1 // 2 bytes: 1 and 2
#define ADDR_MAGIC 3

// Configurable via serial, persisted in EEPROM.
uint8_t spotId = 3;
uint16_t huntYear = 2026;

const char kHuntMimePrefix[] = "x-hunt:";
const char kWandMetaMimeType[] = "x-hunt-meta";

String serialBuffer;

// UID tracking
uint8_t lastUid[10] = {0};
uint8_t lastUidLength = 0;
uint32_t lastSeenAt = 0;

// Shared constants
constexpr uint16_t kPollIntervalMs = 60;
constexpr uint16_t kReadDebounceMs = 450;
constexpr size_t kMaxUserAreaBytes = 888;
constexpr uint8_t kCcPage = 3;
constexpr uint8_t kUserStartPage = 4;

void saveConfig() {
  EEPROM.write(ADDR_SPOT_ID, spotId);
  EEPROM.write(ADDR_HUNT_YEAR, (uint8_t)(huntYear >> 8));
  EEPROM.write(ADDR_HUNT_YEAR + 1, (uint8_t)(huntYear & 0xFF));
  EEPROM.write(ADDR_MAGIC, EEPROM_MAGIC);
  if (EEPROM.commit()) {
    Serial.println("OK: Config saved to EEPROM.");
  } else {
    Serial.println("ERROR: EEPROM commit failed.");
  }
}

void loadConfig() {
  EEPROM.begin(EEPROM_SIZE);
  if (EEPROM.read(ADDR_MAGIC) == EEPROM_MAGIC) {
    spotId = EEPROM.read(ADDR_SPOT_ID);
    huntYear = (uint16_t)(EEPROM.read(ADDR_HUNT_YEAR) << 8) | EEPROM.read(ADDR_HUNT_YEAR + 1);
    Serial.println("Config loaded from EEPROM.");
  } else {
    Serial.println("No valid config in EEPROM, using defaults.");
  }
}

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

void buildHuntMimeType(char* out, size_t outSize) {
  snprintf(out, outSize, "x-hunt:%u", (unsigned)huntYear);
}

void setSpotBit(uint8_t* payload, uint8_t id) {
  // Spot N → bit (N-1) in 64-bit big-endian bitmask.
  const uint8_t bitIndex = id - 1;
  const uint8_t byteIndex = 7 - (bitIndex / 8);
  const uint8_t bitInByte = bitIndex % 8;
  payload[byteIndex] |= (uint8_t)(1u << bitInByte);
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
    for (int8_t b = 7; b >= 0; --b) {
      Serial.print((payload[i] >> b) & 1);
    }
    if (i < 7) Serial.print(" ");
  }
  Serial.println();
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

bool parseWandMetadataPayload(const uint8_t* payload, size_t payloadLen, uint16_t* outYear, String* outName) {
  if (!payload || payloadLen < 3) return false;
  *outYear = ((uint16_t)payload[0] << 8) | payload[1];
  uint8_t nameLen = payload[2];
  if (3 + nameLen != payloadLen) return false;
  *outName = "";
  for (uint8_t i = 0; i < nameLen; i++) {
    *outName += (char)payload[3 + i];
  }
  return true;
}

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
      saveConfig();
    } else {
      Serial.println("ERROR: spot must be 1-64");
    }
    return;
  }

  if (trimmed.startsWith("setYear:")) {
    String valStr = trimmed.substring(8);
    valStr.trim();
    uint16_t val = (uint16_t)valStr.toInt();
    if (val >= 2000 && val <= 2100) {
      huntYear = val;
      Serial.print("OK: huntYear = ");
      Serial.println(huntYear);
      saveConfig();
    } else {
      Serial.println("ERROR: year must be 2000-2100");
    }
    return;
  }

  Serial.println("Commands:");
  Serial.println("  'setSpot: X' (1-64)");
  Serial.println("  'setYear: YYYY' (2000-2100)");
}

void handleSerialInput() {
  while (Serial.available()) {
    char c = (char)Serial.read();
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

#endif
