#include <SPI.h>
#include <MFRC522.h>
#include "../HuntShared.h"

// Wemos D1 Mini + RC522 (SPI) wiring:
// D8 (GPIO15) -> SDA/SS
// D3 (GPIO0)  -> RST
// D5 (GPIO14) -> SCK
// D7 (GPIO13) -> MOSI (SDI on some RC522 boards)
// D6 (GPIO12) -> MISO (SDO on some RC522 boards)
// 3V3 -> VCC
// GND -> GND

constexpr uint8_t kRfidSsPin = 15;   // D8
constexpr uint8_t kRfidRstPin = 0;   // D3

constexpr uint16_t kReadRetryDelayMs = 12;

MFRC522 mfrc522(kRfidSsPin, kRfidRstPin);

void haltTagSession() {
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}

bool readPage(uint8_t page, uint8_t* out4) {
  uint8_t blockBuf[18] = {0};
  uint8_t blockLen = sizeof(blockBuf);

  for (uint8_t attempt = 0; attempt < 2; attempt++) {
    MFRC522::StatusCode status = mfrc522.MIFARE_Read(page, blockBuf, &blockLen);
    if (status == MFRC522::STATUS_OK && blockLen >= 4) {
      memcpy(out4, blockBuf, 4);
      return true;
    }
    delay(kReadRetryDelayMs);
    blockLen = sizeof(blockBuf);
  }

  return false;
}

bool writePage(uint8_t page, const uint8_t* data4) {
  for (uint8_t attempt = 0; attempt < 2; attempt++) {
    MFRC522::StatusCode status = mfrc522.MIFARE_Ultralight_Write(page, const_cast<uint8_t*>(data4), 4);
    if (status == MFRC522::STATUS_OK) return true;
    delay(kReadRetryDelayMs);
  }
  return false;
}

bool readCcPageStable(uint8_t* ccOut) {
  uint8_t ccA[4] = {0};
  uint8_t ccB[4] = {0};
  if (!readPage(kCcPage, ccA)) return false;
  delay(kReadRetryDelayMs);
  if (!readPage(kCcPage, ccB)) return false;
  if (memcmp(ccA, ccB, 4) != 0) return false;
  memcpy(ccOut, ccA, 4);
  return true;
}

bool readRawNdefFromTag(uint8_t* outMessage, size_t outCap, size_t* outLen) {
  uint8_t cc[4] = {0};
  if (!readCcPageStable(cc)) return false;

  const size_t userCapacityBytes = (size_t)cc[2] * 8;
  if (userCapacityBytes == 0 || userCapacityBytes > kMaxUserAreaBytes) return false;

  static uint8_t rawBuf[kMaxUserAreaBytes];
  memset(rawBuf, 0, sizeof(rawBuf));

  const size_t pagesToRead = (userCapacityBytes + 3) / 4;
  size_t rawLen = 0;

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
      if (ndefLen > outCap) return false;
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

bool writeEncodedNdefToTag(const uint8_t* message, size_t messageLen) {
  uint8_t cc[4] = {0};
  if (!readCcPageStable(cc)) {
    Serial.println("Failed to read CC page before write.");
    return false;
  }

  const size_t userCapacityBytes = (size_t)cc[2] * 8;
  if (userCapacityBytes == 0 || userCapacityBytes > kMaxUserAreaBytes) {
    Serial.println("Unsupported tag capacity.");
    return false;
  }

  static uint8_t outBuf[kMaxUserAreaBytes];
  memset(outBuf, 0, sizeof(outBuf));

  size_t o = 0;
  outBuf[o++] = 0x03;
  if (messageLen < 0xFF) {
    outBuf[o++] = (uint8_t)messageLen;
  } else {
    outBuf[o++] = 0xFF;
    outBuf[o++] = (uint8_t)((messageLen >> 8) & 0xFF);
    outBuf[o++] = (uint8_t)(messageLen & 0xFF);
  }

  if (o + messageLen + 1 > userCapacityBytes) {
    Serial.println("NDEF payload does not fit in tag user area.");
    return false;
  }

  memcpy(outBuf + o, message, messageLen);
  o += messageLen;
  outBuf[o++] = 0xFE;

  const size_t writePages = (o + 3) / 4;
  for (size_t i = 0; i < writePages; i++) {
    const uint8_t* pagePtr = outBuf + (i * 4);
    if (!writePage((uint8_t)(kUserStartPage + i), pagePtr)) {
      Serial.print("Write failed at page ");
      Serial.println((unsigned)(kUserStartPage + i));
      return false;
    }
    yield();
  }

  return true;
}

bool writeSpotToTag(uint8_t* uid, uint8_t uidLength) {
  if (spotId < 1 || spotId > 64) {
    Serial.println("spotId must be in range 1..64.");
    return false;
  }

  uint8_t cc[4] = {0};
  if (!readCcPageStable(cc)) {
    Serial.println("Tag coupling unstable (CC read mismatch/fail); skipping write.");
    return false;
  }

  char mimeType[64] = {0};
  buildHuntMimeType(mimeType, sizeof(mimeType));

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

  NdefMessage outMsg;
  if (hasUri) outMsg.addRecord(uriRecord);
  if (hasMeta) outMsg.addRecord(metaRecord);

  for (int i = 0; i < otherYearCount; i++) {
    outMsg.addMimeMediaRecord(otherYearMimeTypes[i], otherYearPayloads[i], 8);
  }

  setSpotBit(huntPayload, spotId);
  outMsg.addMimeMediaRecord(String(mimeType), huntPayload, 8);

  const int encodedSize = outMsg.getEncodedSize();
  if (encodedSize <= 0 || (size_t)encodedSize > kMaxUserAreaBytes) {
    Serial.println("Encoded NDEF message too large.");
    return false;
  }

  static uint8_t encodedNdef[kMaxUserAreaBytes];
  memset(encodedNdef, 0, sizeof(encodedNdef));
  outMsg.encode(encodedNdef);

  if (!writeEncodedNdefToTag(encodedNdef, (size_t)encodedSize)) {
    Serial.println("Failed to write NDEF message.");
    return false;
  }

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

void setup() {
  Serial.begin(115200);
  delay(200);
  loadConfig();

  Serial.println();
  Serial.println("RC522 spot writer (D1 Mini, SPI)");

  SPI.begin();
  mfrc522.PCD_Init();
  delay(4);  // Allow RC522 to fully stabilize after init (helps with NTAG detection on clone boards).
  mfrc522.PCD_SetAntennaGain(MFRC522::RxGain_max);

  // Boost RF field strength and lower receive threshold to improve NTAG21x detection.
  // NTAG produces weaker load modulation than MIFARE Classic, so the defaults are too conservative.
  // GsNReg [7:4]=CWGsN, [3:0]=ModGsN — n-driver conductance. 0xFF = max field strength.
  mfrc522.PCD_WriteRegister(MFRC522::GsNReg, 0xFF);
  // CWGsPReg [5:0]=CWGsP — p-driver conductance during carrier wave. 0x3F = max.
  mfrc522.PCD_WriteRegister(MFRC522::CWGsPReg, 0x3F);
  // RxThresholdReg [7:4]=MinLevel — minimum signal to trigger bit decode.
  // Lower from default 0x84 (MinLevel=8) to 0x44 (MinLevel=4) to detect weaker implant-form NTAG responses.
  mfrc522.PCD_WriteRegister(MFRC522::RxThresholdReg, 0x44);

  Serial.println("RFID ready. Present NTAG21x tag.");
  Serial.print("Configured spotId=");
  Serial.print(spotId);
  Serial.print(" huntYear=");
  Serial.println(huntYear);
}

void loop() {
  handleSerialInput();

  if (!mfrc522.PICC_IsNewCardPresent()) {
    delay(kPollIntervalMs);
    return;
  }

  if (!mfrc522.PICC_ReadCardSerial()) {
    delay(kPollIntervalMs);
    return;
  }

  uint8_t uidLength = mfrc522.uid.size;
  uint8_t uidBuf[10] = {0};
  for (uint8_t i = 0; i < uidLength && i < sizeof(uidBuf); i++) {
    uidBuf[i] = mfrc522.uid.uidByte[i];
  }

  const uint32_t now = millis();
  if (sameUid(uidBuf, uidLength) && (now - lastSeenAt) < kReadDebounceMs) {
    haltTagSession();
    delay(kPollIntervalMs);
    return;
  }

  Serial.println();
  Serial.print("Tag UID(");
  Serial.print(uidLength);
  Serial.print("): ");
  printUid(uidBuf, uidLength);
  Serial.println();

  if (uidLength != 7) {
    Serial.println("Not NTAG21x/Ultralight (UID != 7 bytes), skipping write.");
    rememberUid(uidBuf, uidLength);
    haltTagSession();
    delay(kPollIntervalMs);
    return;
  }

  writeSpotToTag(uidBuf, uidLength);
  rememberUid(uidBuf, uidLength);
  haltTagSession();
  delay(kPollIntervalMs);
}
