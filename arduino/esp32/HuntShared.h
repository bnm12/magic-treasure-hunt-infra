#ifndef HUNT_SHARED_H
#define HUNT_SHARED_H

#include <Arduino.h>
#include <EEPROM.h>
#include <NdefMessage.h>
#include <NdefRecord.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ─── BLE Nordic UART Service ────────────────────────────────────────────────

#define SERVICE_UUID  "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHAR_UUID_RX  "6E400002-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHAR_UUID_TX  "6E400003-B5A3-F393-E0A9-E50E24DCCA9E"

// ─── Shared Constants ───────────────────────────────────────────────────────

constexpr uint16_t kPollIntervalMs   = 60;
constexpr uint16_t kReadDebounceMs   = 450;
constexpr size_t   kMaxUserAreaBytes = 888;
constexpr uint8_t  kCcPage           = 3;
constexpr uint8_t  kUserStartPage    = 4;

// Forward declaration so callbacks can reference CombiSerial
class CombiSerialClass;
extern CombiSerialClass CombiSerial;

BLEServer           *pServer           = nullptr;
BLECharacteristic   *pTxCharacteristic = nullptr;
BLEAdvertising      *pAdvertising      = nullptr;
bool                 deviceConnected   = false;
bool                 advertising       = false;

// ─── CombiSerial ────────────────────────────────────────────────────────────

class CombiSerialClass {
public:
  void begin(unsigned long baud) {
    Serial.begin(baud);
  }

  // ── Output ────────────────────────────────────────────────────────────────
  void print(const String& s)        { toAll(s); }
  void println(const String& s)      { toAll(s + "\n"); }
  void print(const char* s)          { toAll(String(s)); }
  void println(const char* s)        { toAll(String(s) + "\n"); }
  void print(int n)                  { toAll(String(n)); }
  void println(int n)                { toAll(String(n) + "\n"); }
  void print(unsigned int n)         { toAll(String(n)); }
  void println(unsigned int n)       { toAll(String(n) + "\n"); }
  void print(long n)                 { toAll(String(n)); }
  void println(long n)               { toAll(String(n) + "\n"); }
  void print(unsigned long n)        { toAll(String(n)); }
  void println(unsigned long n)      { toAll(String(n) + "\n"); }
  void print(float f, int dp = 2)        { toAll(String(f, dp)); }
  void println(float f, int dp = 2)      { toAll(String(f, dp) + "\n"); }
  void print(unsigned long n, int base)  { toAll(String(n, base)); }
  void println(unsigned long n, int base){ toAll(String(n, base) + "\n"); }
  void print(char c)                     { toAll(String(c)); }
  void println(char c)                   { toAll(String(c) + "\n"); }
  void println()                         { toAll("\n"); }

  // ── Input ─────────────────────────────────────────────────────────────────
  bool available() {
    drainSerial();
    return rxBuffer.length() > 0;
  }

  String readStringUntil(char c) {
    drainSerial();
    int idx = rxBuffer.indexOf(c);
    if (idx == -1) return "";
    String result = rxBuffer.substring(0, idx);
    rxBuffer = rxBuffer.substring(idx + 1);
    return result;
  }

  // Called from BLE RX callback
  void injectBLE(const String& data) {
    rxBuffer += data;
  }

private:
  String rxBuffer = "";

  void drainSerial() {
    while (Serial.available()) {
      rxBuffer += (char)Serial.read();
    }
  }

  void toAll(const String& s) {
    Serial.print(s);
    if (!deviceConnected || !pTxCharacteristic) return;
    const uint8_t* data = (const uint8_t*)s.c_str();
    size_t len = s.length();
    for (size_t i = 0; i < len; i += 20) {
      size_t chunkLen = min((size_t)20, len - i);
      pTxCharacteristic->setValue(data + i, chunkLen);
      pTxCharacteristic->notify();
      delay(10);
    }
  }
};

CombiSerialClass CombiSerial;

// ─── BLE Callbacks ──────────────────────────────────────────────────────────

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    advertising = false;
    CombiSerial.println("Client connected");
  }
  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    CombiSerial.println("Client disconnected");
  }
};

class RxCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) {
    String value = pCharacteristic->getValue();
    if (value.length() > 0) {
      CombiSerial.injectBLE(value);
    }
  }
};

// ─── BLE Init ───────────────────────────────────────────────────────────────

void initBLE() {
  BLEDevice::init("NFC Config");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);

  pTxCharacteristic = pService->createCharacteristic(
    CHAR_UUID_TX, BLECharacteristic::PROPERTY_NOTIFY
  );
  pTxCharacteristic->addDescriptor(new BLE2902());

  BLECharacteristic* pRxCharacteristic = pService->createCharacteristic(
    CHAR_UUID_RX, BLECharacteristic::PROPERTY_WRITE
  );
  pRxCharacteristic->setCallbacks(new RxCallbacks());

  pService->start();

  pAdvertising = pServer->getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
}

// ─── EEPROM / Config ────────────────────────────────────────────────────────

#define EEPROM_SIZE 512
#define EEPROM_MAGIC 0x42
#define ADDR_SPOT_ID 0
#define ADDR_HUNT_YEAR 1
#define ADDR_MAGIC 3

uint8_t  spotId   = 3;
uint16_t huntYear = 2026;

void saveConfig() {
  EEPROM.write(ADDR_SPOT_ID, spotId);
  EEPROM.write(ADDR_HUNT_YEAR,     (uint8_t)(huntYear >> 8));
  EEPROM.write(ADDR_HUNT_YEAR + 1, (uint8_t)(huntYear & 0xFF));
  EEPROM.write(ADDR_MAGIC, EEPROM_MAGIC);
  if (EEPROM.commit()) {
    CombiSerial.print("CONFIG:");
    CombiSerial.print(spotId);
    CombiSerial.print(",");
    CombiSerial.println(huntYear);
    CombiSerial.println("OK: Config saved to EEPROM.");
  } else {
    CombiSerial.println("ERROR: EEPROM commit failed.");
  }
}

void loadConfig() {
  EEPROM.begin(EEPROM_SIZE);
  if (EEPROM.read(ADDR_MAGIC) == EEPROM_MAGIC) {
    spotId   = EEPROM.read(ADDR_SPOT_ID);
    huntYear = (uint16_t)(EEPROM.read(ADDR_HUNT_YEAR) << 8) | EEPROM.read(ADDR_HUNT_YEAR + 1);
    CombiSerial.println("Config loaded from EEPROM.");
  } else {
    CombiSerial.println("No valid config in EEPROM, using defaults.");
  }
}

// ─── UID Helpers ────────────────────────────────────────────────────────────

uint8_t  lastUid[10]  = {0};
uint8_t  lastUidLength = 0;
uint32_t lastSeenAt    = 0;

void printHexByte(uint8_t value) {
  if (value < 0x10) CombiSerial.print("0");
  CombiSerial.print(value, HEX);
}

void printUid(const uint8_t* uid, uint8_t uidLength) {
  for (uint8_t i = 0; i < uidLength; i++) {
    printHexByte(uid[i]);
    if (i + 1 < uidLength) CombiSerial.print(":");
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

// ─── NFC Helpers ────────────────────────────────────────────────────────────

const char kHuntMimePrefix[]   = "x-hunt:";
const char kWandMetaMimeType[] = "x-hunt-meta";

void buildHuntMimeType(char* out, size_t outSize) {
  snprintf(out, outSize, "x-hunt:%u", (unsigned)huntYear);
}

void setSpotBit(uint8_t* payload, uint8_t id) {
  const uint8_t bitIndex  = id - 1;
  const uint8_t byteIndex = 7 - (bitIndex / 8);
  const uint8_t bitInByte = bitIndex % 8;
  payload[byteIndex] |= (uint8_t)(1u << bitInByte);
}

void printHuntPayload(const uint8_t* payload) {
  CombiSerial.print("  Payload (hex): ");
  for (uint8_t i = 0; i < 8; i++) {
    printHexByte(payload[i]);
    if (i < 7) CombiSerial.print(" ");
  }
  CombiSerial.println();

  CombiSerial.print("  Payload (binary): ");
  for (uint8_t i = 0; i < 8; i++) {
    for (int8_t b = 7; b >= 0; --b) {
      CombiSerial.print((int)((payload[i] >> b) & 1));
    }
    if (i < 7) CombiSerial.print(" ");
  }
  CombiSerial.println();
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

// ─── Serial Command Handler ──────────────────────────────────────────────────

String serialBuffer;

void processSerialCommand(const String& cmd) {
  String trimmed = cmd;
  trimmed.trim();

  if (trimmed == "getConfig") {
    CombiSerial.print("CONFIG:");
    CombiSerial.print(spotId);
    CombiSerial.print(",");
    CombiSerial.println(huntYear);
    return;
  }

  if (trimmed.startsWith("setSpot:")) {
    String valStr = trimmed.substring(8);
    valStr.trim();
    uint8_t val = (uint8_t)valStr.toInt();
    if (val >= 1 && val <= 64) {
      spotId = val;
      CombiSerial.print("OK: spotId = ");
      CombiSerial.println(spotId);
      saveConfig();
    } else {
      CombiSerial.println("ERROR: spot must be 1-64");
    }
    return;
  }

  if (trimmed.startsWith("setYear:")) {
    String valStr = trimmed.substring(8);
    valStr.trim();
    uint16_t val = (uint16_t)valStr.toInt();
    if (val >= 2000 && val <= 2100) {
      huntYear = val;
      CombiSerial.print("OK: huntYear = ");
      CombiSerial.println(huntYear);
      saveConfig();
    } else {
      CombiSerial.println("ERROR: year must be 2000-2100");
    }
    return;
  }

  CombiSerial.println("Commands:");
  CombiSerial.println("  'getConfig'");
  CombiSerial.println("  'setSpot: X' (1-64)");
  CombiSerial.println("  'setYear: YYYY' (2000-2100)");
}

void handleSerialInput() {
  while (CombiSerial.available()) {
    String line = CombiSerial.readStringUntil('\n');
    line.trim();
    if (line.length() > 0) {
      processSerialCommand(line);
    }
  }
}

// ─── BLE Button Tick (call from loop) ───────────────────────────────────────

void tickBLE(uint8_t buttonPin) {
  if (digitalRead(buttonPin) == LOW && !deviceConnected) {
    if (!advertising) {
      CombiSerial.println("BLE advertising started");
      pAdvertising->start();
      advertising = true;
    }
  } else if (!deviceConnected && advertising) {
    pAdvertising->stop();
    advertising = false;
    CombiSerial.println("BLE advertising stopped");
  }
}

#endif
