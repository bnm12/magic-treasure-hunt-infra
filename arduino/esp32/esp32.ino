#pragma GCC optimize("O0")

#include <Wire.h>
#include <PN532_I2C.h>
#include <PN532.h>
#include "HuntShared.h"
#include "WandNdefCodec.h"

// ─── C3 Mini Pinout ─────────────────────────────────────────────────────────
// GPIO8  -> SDA
// GPIO10 -> SCL
// GPIO9  -> Boot button (used to enable BLE advertising)
// GPIO7  -> Onboard LED (active low on LOLIN C3 Mini)
// 3V3    -> VCC
// GND    -> GND

constexpr uint8_t kI2cSdaPin          = 8;
constexpr uint8_t kI2cSclPin          = 10;
constexpr uint8_t kButtonPin          = 9;
constexpr uint8_t kLedPin             = 7;   // LOLIN C3 Mini onboard LED
constexpr uint8_t kPn532I2cAddress    = 0x24;

constexpr uint16_t kPn532BootDelayMs  = 2000;
constexpr uint16_t kRetryIntervalMs   = 2000;
constexpr uint8_t  kPassiveActivationRetries = 0x20;
constexpr uint16_t kCiuRfCfgRegister  = 0x6316;

PN532_I2C pn532I2c(Wire);
PN532     pn532(pn532I2c);

uint32_t lastRetryAt = 0;
bool     initialized = false;

// ─── PN532 Helpers ──────────────────────────────────────────────────────────

bool readPage(uint8_t page, uint8_t* data) {
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
  if (memcmp(ccA, ccB, sizeof(ccA)) != 0) return false;
  memcpy(ccOut, ccA, sizeof(ccA));
  return true;
}

bool unstickI2cBusIfNeeded() {
  pinMode(kI2cSdaPin, INPUT_PULLUP);
  pinMode(kI2cSclPin, INPUT_PULLUP);
  delayMicroseconds(10);
  if (digitalRead(kI2cSdaPin)) return false;

  CombiSerial.println("SDA held low - clocking SCL to release stuck slave...");
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
    if (!(status & 0x01)) break;

    CombiSerial.println("PN532 has buffered response - draining...");
    Wire.requestFrom(kPn532I2cAddress, (uint8_t)32);
    while (Wire.available()) Wire.read();
    delay(50);
  }
}

void configurePn532(uint32_t versionData) {
  CombiSerial.print("PN532 FW: PN5");
  CombiSerial.print((unsigned long)((versionData >> 24) & 0xFF), HEX);
  CombiSerial.print(" v");
  CombiSerial.print((unsigned long)((versionData >> 16) & 0xFF), DEC);
  CombiSerial.print(".");
  CombiSerial.println((unsigned long)((versionData >> 8) & 0xFF), DEC);

  pn532.setPassiveActivationRetries(kPassiveActivationRetries);
  pn532.SAMConfig();

  if (pn532.setRFField(0x00, 0x01)) {
    CombiSerial.println("RF field enabled.");
  } else {
    CombiSerial.println("WARNING: Failed to enable RF field.");
  }

  uint32_t rfCfg     = pn532.readRegister(kCiuRfCfgRegister);
  uint8_t  rfCfgByte = (uint8_t)(rfCfg & 0xFF);
  uint8_t  boosted   = (uint8_t)((rfCfgByte & 0x8F) | 0x70);
  if (pn532.writeRegister(kCiuRfCfgRegister, boosted)) {
    CombiSerial.print("RX gain boosted: 0x");
    printHexByte(rfCfgByte);
    CombiSerial.print(" -> 0x");
    printHexByte(boosted);
    CombiSerial.println();
  } else {
    CombiSerial.println("WARNING: Failed to boost RX gain.");
  }

  CombiSerial.println("Ready. Present NTAG216 tag.");
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

// ─── NDEF Read/Write ─────────────────────────────────────────────────────────

bool readRawNdefFromTag(uint8_t* outMessage, size_t outCap, size_t* outLen) {
  uint8_t cc[4] = {0};
  if (!readCcPageStable(cc)) {
    CombiSerial.println("Failed to read CC page.");
    return false;
  }

  const size_t userCapacityBytes = (size_t)cc[2] * 8;
  if (userCapacityBytes == 0 || userCapacityBytes > kMaxUserAreaBytes) {
    CombiSerial.println("Unsupported tag capacity.");
    return false;
  }

  static uint8_t rawBuf[kMaxUserAreaBytes];
  memset(rawBuf, 0, sizeof(rawBuf));

  size_t rawLen = 0;
  const size_t pagesToRead = (userCapacityBytes + 3) / 4;
  for (size_t i = 0; i < pagesToRead; i++) {
    uint8_t pageData[4] = {0};
    if (!readPage((uint8_t)(kUserStartPage + i), pageData)) {
      CombiSerial.print("Read failed at page ");
      CombiSerial.println((int)(kUserStartPage + i));
      break;
    }

    memcpy(rawBuf + rawLen, pageData, 4);
    rawLen += 4;

    size_t ndefOff = 0;
    size_t ndefLen = 0;
    if (findNdefTlv(rawBuf, rawLen, &ndefOff, &ndefLen) && ndefOff + ndefLen <= rawLen) {
      if (ndefLen > outCap) {
        CombiSerial.println("NDEF message too large for buffer.");
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
  constexpr uint8_t kProbePages = 4;
  for (uint8_t i = 0; i < kProbePages; i++) {
    uint8_t pageData[4] = {0};
    if (!readPage((uint8_t)(kUserStartPage + i), pageData)) return false;
    for (uint8_t b = 0; b < 4; b++) {
      if (pageData[b] != 0x00) { *isBlank = false; return true; }
    }
  }
  return true;
}

bool writeRawNdefToTag(const uint8_t* message, size_t messageLength) {
  uint8_t ccCheck[4] = {0};
  if (!readCcPageStable(ccCheck)) {
    CombiSerial.println("Tag coupling unstable; refusing raw NDEF write.");
    return false;
  }
  const size_t capacity = static_cast<size_t>(ccCheck[2]) * 8;
  if (capacity == 0 || capacity > kMaxUserAreaBytes) {
    CombiSerial.println("Unsupported tag capacity for raw NDEF write.");
    return false;
  }
  const size_t headerLength = messageLength < 0xFF ? 2 : 4;
  const size_t usedLength = headerLength + messageLength + 1;
  const size_t writeLength = (usedLength + 3) & ~static_cast<size_t>(3);
  if (writeLength > capacity || writeLength > kMaxUserAreaBytes) {
    CombiSerial.println("NDEF output exceeds deterministic tag capacity.");
    return false;
  }
  static uint8_t encoded[kMaxUserAreaBytes] = {0};
  memset(encoded, 0, sizeof(encoded));
  encoded[0] = 0x03;
  if (messageLength < 0xFF) {
    encoded[1] = static_cast<uint8_t>(messageLength);
  } else {
    encoded[1] = 0xFF;
    encoded[2] = static_cast<uint8_t>((messageLength >> 8) & 0xFF);
    encoded[3] = static_cast<uint8_t>(messageLength & 0xFF);
  }
  memcpy(encoded + headerLength, message, messageLength);
  encoded[headerLength + messageLength] = 0xFE;

  for (size_t offset = 0; offset < writeLength; offset += 4) {
    if (!pn532.mifareultralight_WritePage(
            static_cast<uint8_t>(kUserStartPage + offset / 4), encoded + offset)) {
      CombiSerial.print("Raw NDEF write failed at page ");
      CombiSerial.println(static_cast<int>(kUserStartPage + offset / 4));
      return false;
    }
  }
  return true;
}

void printCodecType(const WandNdefCodec::Message& message,
                    const WandNdefCodec::Record& record) {
  CombiSerial.print("Type=");
  const uint8_t* type = WandNdefCodec::typeBytes(&message, &record);
  for (size_t index = 0; index < record.typeLength; ++index) {
    CombiSerial.print(static_cast<char>(type[index]));
  }
}

bool writeSpotToTag(uint8_t* uid, uint8_t uidLength) {
  if (spotId < 1 || spotId > 64) {
    CombiSerial.println("spotId must be in range 1..64.");
    return false;
  }
  static uint8_t existingNdef[kMaxUserAreaBytes];
  size_t existingNdefLen = 0;
  const bool hasExistingNdef = readRawNdefFromTag(existingNdef, sizeof(existingNdef), &existingNdefLen);

  if (!hasExistingNdef) {
    bool isBlank = false;
    if (!probeBlankUserArea(&isBlank)) {
      CombiSerial.println("Could not safely verify tag blank state; refusing write.");
      return false;
    }
    if (!isBlank) {
      CombiSerial.println("Existing tag data is unreadable; refusing write to avoid data loss.");
      return false;
    }
    CombiSerial.println("ERROR: Blank tag detected; missing wand metadata (x-hunt-meta). Refusing write.");
    return false;
  }
  (void)uid;
  (void)uidLength;

  static uint8_t parseStorage[kMaxUserAreaBytes];
  static uint8_t planStorage[kMaxUserAreaBytes];
  static uint8_t plannedNdef[kMaxUserAreaBytes];
  size_t plannedNdefLen = 0;
  WandNdefCodec::Diagnostics diagnostics;
  WandNdefCodec::initDiagnostics(&diagnostics);
  const WandNdefCodec::Status planStatus = WandNdefCodec::planSpotWrite(
      existingNdef, existingNdefLen, huntYear, spotId, parseStorage,
      sizeof(parseStorage), planStorage, sizeof(planStorage), plannedNdef,
      sizeof(plannedNdef), &plannedNdefLen, &diagnostics);
  if (planStatus != WandNdefCodec::kOk) {
    CombiSerial.print("ERROR: codec refused spot write (status ");
    CombiSerial.print(static_cast<int>(planStatus));
    CombiSerial.println("). Initialize the wand or repair its metadata first.");
    return false;
  }

  if (!writeRawNdefToTag(plannedNdef, plannedNdefLen)) {
    CombiSerial.println("Failed to write codec-produced NDEF message.");
    return false;
  }

  static uint8_t verifyNdef[kMaxUserAreaBytes];
  size_t verifyNdefLen = 0;
  if (!readRawNdefFromTag(verifyNdef, sizeof(verifyNdef), &verifyNdefLen)) {
    CombiSerial.println("WARNING: Write completed but NDEF readback failed.");
    return false;
  }

  static uint8_t expectedStorage[kMaxUserAreaBytes];
  static uint8_t verifyStorage[kMaxUserAreaBytes];
  WandNdefCodec::Message expectedMessage;
  WandNdefCodec::Message verifyMessage;
  WandNdefCodec::initMessage(&expectedMessage, expectedStorage,
                             sizeof(expectedStorage));
  WandNdefCodec::initMessage(&verifyMessage, verifyStorage,
                             sizeof(verifyStorage));
  if (WandNdefCodec::parse(plannedNdef, plannedNdefLen, &expectedMessage) !=
          WandNdefCodec::kOk ||
      WandNdefCodec::parse(verifyNdef, verifyNdefLen, &verifyMessage) !=
          WandNdefCodec::kOk) {
    CombiSerial.println("WARNING: Codec readback parse failed.");
    return false;
  }
  (void)expectedStorage;
  (void)verifyStorage;
  if (!WandNdefCodec::semanticallyEquivalent(&expectedMessage, &verifyMessage)) {
    CombiSerial.println("WARNING: NDEF readback is not semantically equivalent.");
    return false;
  }

  CombiSerial.print("NDEF readback length: ");
  CombiSerial.print(static_cast<int>(verifyNdefLen));
  CombiSerial.println(" bytes");
  CombiSerial.print("NDEF records: ");
  CombiSerial.println(static_cast<int>(verifyMessage.recordCount));
  for (size_t i = 0; i < verifyMessage.recordCount; ++i) {
    const WandNdefCodec::Record& vr = verifyMessage.records[i];
    CombiSerial.print("  #");
    CombiSerial.print(static_cast<int>(i + 1));
    CombiSerial.print(" TNF=");
    CombiSerial.print(static_cast<int>(vr.tnf));
    CombiSerial.print(" ");
    printCodecType(verifyMessage, vr);
    CombiSerial.print(" PayloadLen=");
    CombiSerial.println(static_cast<int>(vr.payloadLength));
  }

  CombiSerial.print("SUCCESS: spot ");
  CombiSerial.print(spotId);
  CombiSerial.print(" written to year ");
  CombiSerial.println(huntYear);
  WandNdefCodec::LedgerRead readback;
  WandNdefCodec::inspect(&verifyMessage, &readback);
  for (size_t i = 0; i < readback.huntCount; ++i) {
    if (readback.hunts[i].year == huntYear) {
      uint8_t huntPayload[8] = {0};
      uint64_t mask = readback.hunts[i].mask;
      for (int byte = 7; byte >= 0; --byte) {
        huntPayload[byte] = static_cast<uint8_t>(mask & 0xff);
        mask >>= 8;
      }
      printHuntPayload(huntPayload);
      break;
    }
  }
  return true;
}

// ─── Setup ──────────────────────────────────────────────────────────────────

void setup() {  
  CombiSerial.begin(115200);
  delay(200);

  pinMode(kLedPin, OUTPUT);
  digitalWrite(kLedPin, LOW);  // Off (active low on C3 Mini)
  pinMode(kButtonPin, INPUT_PULLUP);

  initBLE();

  loadConfig();

  CombiSerial.println();
  CombiSerial.println("PN532 spot writer (C3 Mini, I2C + BLE)");
  CombiSerial.print("Interface: I2C SDA=");
  CombiSerial.print(kI2cSdaPin);
  CombiSerial.print(" SCL=");
  CombiSerial.println(kI2cSclPin);
  CombiSerial.print("Configured spotId=");
  CombiSerial.print(spotId);
  CombiSerial.print(" huntYear=");
  CombiSerial.println(huntYear);
  CombiSerial.println("Hold button 9 to enable BLE");

  CombiSerial.print("Settling ");
  CombiSerial.print(kPn532BootDelayMs);
  CombiSerial.println(" ms...");
  delay(kPn532BootDelayMs);

  if (!tryInitPn532()) {
    CombiSerial.println("PN532 not detected. Will retry every 2 s.");
    digitalWrite(kLedPin, HIGH);  // On
  }
}

// ─── Loop ───────────────────────────────────────────────────────────────────

void loop() {
  tickBLE(kButtonPin);
  handleSerialInput();

  if (!initialized) {
    const uint32_t now = millis();
    if (now - lastRetryAt >= kRetryIntervalMs) {
      lastRetryAt = now;
      if (!tryInitPn532()) {
        CombiSerial.println("PN532 still not detected, retrying...");
        digitalWrite(kLedPin, !digitalRead(kLedPin));  // Toggle
      } else {
        digitalWrite(kLedPin, LOW);  // Off
      }
    }
    delay(50);
    return;
  }

  uint8_t uid[7]    = {0};
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

  CombiSerial.println();
  CombiSerial.print("Tag UID(");
  CombiSerial.print(uidLength);
  CombiSerial.print("): ");
  printUid(uid, uidLength);
  CombiSerial.println();

  if (uidLength != 7) {
    CombiSerial.println("Not NTAG21x/Ultralight (UID != 7 bytes), skipping write.");
    rememberUid(uid, uidLength);
    delay(kPollIntervalMs);
    return;
  }

  writeSpotToTag(uid, uidLength);
  rememberUid(uid, uidLength);
  delay(kPollIntervalMs);
}
