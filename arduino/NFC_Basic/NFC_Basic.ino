#include <SPI.h>
#include <MFRC522v2.h>
#include <MFRC522DriverSPI.h>
#include <MFRC522DriverPinSimple.h>
#include <MFRC522Debug.h>

// Keep PN532 support optional so the sketch still compiles without those libraries.
#define ENABLE_PN532 0

#if ENABLE_PN532
#include <Wire.h>
#include <PN532_I2C.h>
#include <PN532.h>

PN532_I2C pn532I2c(Wire);
PN532 pn532(pn532I2c);
#endif

// D1 Mini default wiring from previous prototype:
// SDA/SS -> D8 (GPIO15), SCK -> D5, MISO -> D6, MOSI -> D7, RST -> D0 (optional)
MFRC522DriverPinSimple mfrc522SsPin(15);
MFRC522DriverSPI mfrc522Driver(mfrc522SsPin);
MFRC522 mfrc522(mfrc522Driver);

void setup() {
  Serial.begin(115200);
  delay(200);

  SPI.begin();
  mfrc522.PCD_Init();
  mfrc522.PCD_SetAntennaGain(MFRC522Constants::RxGain_max);

  Serial.println();
  Serial.println("NFC basic reader starting...");
  MFRC522Debug::PCD_DumpVersionToSerial(mfrc522, Serial);

#if ENABLE_PN532
  pn532.begin();
  uint32_t versionData = pn532.getFirmwareVersion();
  if (versionData) {
    Serial.print("Found PN5");
    Serial.println((versionData >> 24) & 0xFF, HEX);
    pn532.setPassiveActivationRetries(0xFF);
    pn532.SAMConfig();
  } else {
    Serial.println("PN532 not detected");
  }
#endif

  Serial.println("Scan an RFID/NFC card to print UID details...");
}

void loop() {
  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
    MFRC522Debug::PICC_DumpDetailsToSerial(mfrc522, Serial, &mfrc522.uid);
    delay(300);
    return;
  }

#if ENABLE_PN532
  uint8_t uid[7] = {0, 0, 0, 0, 0, 0, 0};
  uint8_t uidLength = 0;

  if (pn532.readPassiveTargetID(PN532_MIFARE_ISO14443A, uid, &uidLength)) {
    Serial.print("PN532 UID (length ");
    Serial.print(uidLength);
    Serial.print("): ");
    for (uint8_t i = 0; i < uidLength; i++) {
      if (uid[i] < 0x10) {
        Serial.print('0');
      }
      Serial.print(uid[i], HEX);
      Serial.print(' ');
    }
    Serial.println();
    delay(300);
  }
#endif
}
