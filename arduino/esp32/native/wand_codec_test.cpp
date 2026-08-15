#include <stdio.h>
#include <string.h>

#include "../WandNdefCodec.h"
#include "generated/wand_fixtures.h"

using namespace WandNdefCodec;

namespace {

int failures = 0;

void check(bool condition, const char* message) {
  if (!condition) {
    ++failures;
    fprintf(stderr, "FAIL: %s\n", message);
  }
}

struct RawBuilder {
  uint8_t bytes[kMaxMessageBytes] = {0};
  size_t length = 0;
  size_t count = 0;

  void add(const char* type, uint8_t tnf, const uint8_t* payload,
           size_t payloadLength) {
    const size_t typeLength = strlen(type);
    const bool shortRecord = payloadLength <= 255;
    bytes[length++] = static_cast<uint8_t>(tnf | (count == 0 ? 0x80 : 0) |
                                           (shortRecord ? 0x10 : 0));
    bytes[length++] = static_cast<uint8_t>(typeLength);
    if (shortRecord) {
      bytes[length++] = static_cast<uint8_t>(payloadLength);
    } else {
      bytes[length++] = static_cast<uint8_t>((payloadLength >> 24) & 0xff);
      bytes[length++] = static_cast<uint8_t>((payloadLength >> 16) & 0xff);
      bytes[length++] = static_cast<uint8_t>((payloadLength >> 8) & 0xff);
      bytes[length++] = static_cast<uint8_t>(payloadLength & 0xff);
    }
    memcpy(bytes + length, type, typeLength);
    length += typeLength;
    if (payloadLength != 0) {
      memcpy(bytes + length, payload, payloadLength);
      length += payloadLength;
    }
    ++count;
  }

  void finish() {
    if (count != 0) {
      size_t offset = 0;
      while (offset < length) {
        const uint8_t header = bytes[offset];
        const bool shortRecord = (header & 0x10) != 0;
        const size_t typeLength = bytes[offset + 1];
        const size_t payloadLength =
            shortRecord
                ? bytes[offset + 2]
                : (static_cast<size_t>(bytes[offset + 2]) << 24) |
                      (static_cast<size_t>(bytes[offset + 3]) << 16) |
                      (static_cast<size_t>(bytes[offset + 4]) << 8) |
                      bytes[offset + 5];
        bytes[offset] = static_cast<uint8_t>(bytes[offset] & ~0x40);
        const size_t headerLength = shortRecord ? 3 : 6;
        offset += headerLength + typeLength + payloadLength;
      }
      size_t offsetLast = 0;
      while (offsetLast < length) {
        const uint8_t header = bytes[offsetLast];
        const bool shortRecord = (header & 0x10) != 0;
        const size_t typeLength = bytes[offsetLast + 1];
        const size_t payloadLength =
            shortRecord
                ? bytes[offsetLast + 2]
                : (static_cast<size_t>(bytes[offsetLast + 2]) << 24) |
                      (static_cast<size_t>(bytes[offsetLast + 3]) << 16) |
                      (static_cast<size_t>(bytes[offsetLast + 4]) << 8) |
                      bytes[offsetLast + 5];
        const size_t headerLength = shortRecord ? 3 : 6;
        const size_t next = offsetLast + headerLength + typeLength + payloadLength;
        if (next == length) bytes[offsetLast] |= 0x40;
        offsetLast = next;
      }
    }
  }
};

bool parseMessage(const uint8_t* bytes, size_t length, Message* message,
                  uint8_t* storage) {
  initMessage(message, storage, kMaxMessageBytes);
  return parse(bytes, length, message) == kOk;
}

const Record* recordOfType(const Message& message, const char* type) {
  for (size_t index = 0; index < message.recordCount; ++index) {
    const Record* record = &message.records[index];
    if (record->typeLength == strlen(type) &&
        memcmp(typeBytes(&message, record), type, record->typeLength) == 0) {
      return record;
    }
  }
  return nullptr;
}

void testGeneratedFixture() {
  uint8_t storage[kMaxMessageBytes] = {0};
  Message message;
  check(parseMessage(WandFixtures::duplicateMergeFixture.data,
                      WandFixtures::duplicateMergeFixture.length, &message,
                      storage),
        "duplicate fixture parses");
  LedgerRead read;
  check(inspect(&message, &read) == kOk, "duplicate fixture inspects");
  check(read.metadataStatus == kMetadataStatusValid, "metadata is valid");
  check(read.huntCount == 2, "two hunt years discovered");
  check(read.hunts[0].year == 2026 && read.hunts[0].mask == 7,
        "2026 duplicate masks OR together");
  check(read.hunts[1].year == 2025 && read.hunts[1].mask == 8,
        "2025 mask is preserved");

  uint8_t encoded[kMaxMessageBytes] = {0};
  size_t encodedLength = 0;
  check(encode(&message, encoded, sizeof(encoded), &encodedLength) == kOk &&
            encodedLength == WandFixtures::duplicateMergeFixture.length &&
            memcmp(encoded, WandFixtures::duplicateMergeFixture.data,
                   encodedLength) == 0,
        "parse and encode preserve NDEF flags and bytes");
}

void testNdefFieldRoundTrip() {
  const uint8_t raw[] = {
      0xcb, 1, 0, 0, 0, 4, 2, 'T', 0xa1, 0xa2, 1, 2, 3, 4,
  };
  uint8_t storage[kMaxMessageBytes] = {0};
  Message message;
  uint8_t encoded[kMaxMessageBytes] = {0};
  size_t encodedLength = 0;
  check(parseMessage(raw, sizeof(raw), &message, storage),
        "long NDEF record with an ID parses");
  check(message.recordCount == 1 && message.records[0].flags == 0xcb &&
            message.records[0].tnf == 3 && message.records[0].typeLength == 1 &&
            message.records[0].idLength == 2 &&
            message.records[0].payloadLength == 4,
        "NDEF flags, TNF, type, ID, and payload are retained");
  check(encode(&message, encoded, sizeof(encoded), &encodedLength) == kOk &&
            encodedLength == sizeof(raw) &&
            memcmp(encoded, raw, sizeof(raw)) == 0,
        "long NDEF record round-trips byte-for-byte");
}

void testAliasesAndWriteProtection() {
  uint8_t storage[kMaxMessageBytes] = {0};
  Message message;
  check(parseMessage(WandFixtures::opaqueAliasesAndMalformedMetadataFixture.data,
                     WandFixtures::opaqueAliasesAndMalformedMetadataFixture.length,
                     &message, storage),
        "alias fixture parses");
  LedgerRead read;
  check(inspect(&message, &read) == kOk &&
            read.huntCount == 0 &&
            read.metadataStatus == kMetadataStatusMalformed,
        "aliases stay opaque and malformed metadata is diagnosed");

  uint8_t parseStorage[kMaxMessageBytes] = {0};
  uint8_t planStorage[kMaxMessageBytes] = {0};
  uint8_t output[kMaxMessageBytes] = {0};
  size_t outputLength = 0;
  Diagnostics diagnostics;
  initDiagnostics(&diagnostics);
  check(planSpotWrite(WandFixtures::duplicateMergeFixture.data,
                      WandFixtures::duplicateMergeFixture.length, 2026, 64,
                      parseStorage, sizeof(parseStorage), planStorage,
                      sizeof(planStorage), output, sizeof(output), &outputLength,
                      &diagnostics) == kOk,
        "spot write plan succeeds");
  Message planned;
  uint8_t plannedStorage[kMaxMessageBytes] = {0};
  check(parseMessage(output, outputLength, &planned, plannedStorage),
        "spot plan output parses");
  check(planned.recordCount == message.recordCount ||
            planned.recordCount == 5,
        "spot plan retains opaque records and canonicalizes hunts");
  check(planned.recordCount > 0 &&
            planned.records[0].typeLength == message.records[0].typeLength &&
            memcmp(typeBytes(&planned, &planned.records[0]),
                   typeBytes(&message, &message.records[0]),
                   planned.records[0].typeLength) == 0,
        "Record 1 remains opaque");
  LedgerRead plannedRead;
  inspect(&planned, &plannedRead);
  const int huntIndex = plannedRead.huntCount > 0 &&
                                plannedRead.hunts[0].year == 2026
                            ? 0
                            : 1;
  check(huntIndex >= 0 && (plannedRead.hunts[huntIndex].mask & (1ULL << 63)) != 0,
        "spot 64 is written");

  RawBuilder oneSpot;
  const uint8_t meta[] = {7, 234, 3, 'A', 'd', 'a'};
  oneSpot.add("record-1", 0x05, nullptr, 0);
  oneSpot.add("x-hunt-meta", 0x02, meta, sizeof(meta));
  oneSpot.finish();
  size_t oneLength = 0;
  check(planSpotWrite(oneSpot.bytes, oneSpot.length, 2026, 1, parseStorage,
                      sizeof(parseStorage), planStorage, sizeof(planStorage),
                      output, sizeof(output), &oneLength, nullptr) == kOk,
        "spot 1 is accepted");
  Message oneMessage;
  uint8_t oneStorage[kMaxMessageBytes] = {0};
  check(parseMessage(output, oneLength, &oneMessage, oneStorage),
        "spot 1 output parses");
  inspect(&oneMessage, &plannedRead);
  check(plannedRead.huntCount == 1 && plannedRead.hunts[0].mask == 1,
        "spot 1 sets the least significant mask bit");
}

void testValidationAndRefusal() {
  const uint8_t validMeta[] = {7, 234, 3, 'A', 'd', 'a'};
  const uint8_t invalidUtf8[] = {7, 234, 1, 0xc0};
  const uint8_t malformedLength[] = {7, 234, 5, 'A'};
  const uint8_t hunt[] = {0, 0, 0, 0, 0, 0, 0, 1};

  RawBuilder duplicate;
  duplicate.add("record-1", 0x05, nullptr, 0);
  duplicate.add("x-hunt-meta", 0x02, validMeta, sizeof(validMeta));
  duplicate.add("x-hunt-meta", 0x02, validMeta, sizeof(validMeta));
  duplicate.finish();

  RawBuilder conflicting;
  const uint8_t otherMeta[] = {7, 235, 3, 'A', 'd', 'a'};
  conflicting.add("record-1", 0x05, nullptr, 0);
  conflicting.add("x-hunt-meta", 0x02, validMeta, sizeof(validMeta));
  conflicting.add("x-hunt-meta", 0x02, otherMeta, sizeof(otherMeta));
  conflicting.finish();

  RawBuilder malformed;
  malformed.add("record-1", 0x05, nullptr, 0);
  malformed.add("x-hunt-meta", 0x02, malformedLength, sizeof(malformedLength));
  malformed.finish();

  RawBuilder utf8;
  utf8.add("record-1", 0x05, nullptr, 0);
  utf8.add("x-hunt-meta", 0x02, invalidUtf8, sizeof(invalidUtf8));
  utf8.finish();

  RawBuilder validSpot;
  validSpot.add("record-1", 0x05, nullptr, 0);
  validSpot.add("x-hunt-meta", 0x02, validMeta, sizeof(validMeta));
  validSpot.add("x-hunt:2026", 0x02, hunt, sizeof(hunt));
  validSpot.finish();

  const RawBuilder* cases[] = {&duplicate, &conflicting, &malformed, &utf8};
  for (const RawBuilder* testCase : cases) {
    uint8_t storage[kMaxMessageBytes] = {0};
    Message message;
    check(parseMessage(testCase->bytes, testCase->length, &message, storage),
          "validation case parses");
    LedgerRead read;
    inspect(&message, &read);
    check(read.metadataStatus != kMetadataStatusValid,
          "invalid metadata is not accepted");
  }

  uint8_t parseStorage[kMaxMessageBytes] = {0};
  uint8_t planStorage[kMaxMessageBytes] = {0};
  uint8_t output[kMaxMessageBytes] = {0};
  size_t outputLength = 0;
  check(planSpotWrite(duplicate.bytes, duplicate.length, 2026, 1, parseStorage,
                      sizeof(parseStorage), planStorage, sizeof(planStorage),
                      output, sizeof(output), &outputLength, nullptr) ==
            kMetadataRequired,
        "duplicate metadata blocks a write");
  check(planSpotWrite(conflicting.bytes, conflicting.length, 2026, 1,
                      parseStorage, sizeof(parseStorage), planStorage,
                      sizeof(planStorage), output, sizeof(output), &outputLength,
                      nullptr) == kMetadataRequired,
        "conflicting metadata blocks a write");
  check(planSpotWrite(validSpot.bytes, validSpot.length, 2026, 0, parseStorage,
                      sizeof(parseStorage), planStorage, sizeof(planStorage),
                      output, sizeof(output), &outputLength, nullptr) ==
            kInvalidSpotId,
        "spot zero is rejected");
  check(planSpotWrite(validSpot.bytes, validSpot.length, 2026, 65, parseStorage,
                      sizeof(parseStorage), planStorage, sizeof(planStorage),
                      output, sizeof(output), &outputLength, nullptr) ==
            kInvalidSpotId,
        "spot 65 is rejected");
}

void testRepairOrderingAndCapacity() {
  uint8_t parseStorage[kMaxMessageBytes] = {0};
  uint8_t planStorage[kMaxMessageBytes] = {0};
  uint8_t output[kMaxMessageBytes] = {0};
  size_t outputLength = 0;
  check(planSpotWrite(WandFixtures::repairKeepsValidSameYearFixture.data,
                      WandFixtures::repairKeepsValidSameYearFixture.length, 2026,
                      2, parseStorage, sizeof(parseStorage), planStorage,
                      sizeof(planStorage), output, sizeof(output), &outputLength,
                      nullptr) == kOk,
        "malformed hunt repair succeeds");
  uint8_t storage[kMaxMessageBytes] = {0};
  Message message;
  check(parseMessage(output, outputLength, &message, storage),
        "repaired output parses");
  check(message.recordCount == 4 &&
            recordOfType(message, "x-hunt-invalid:2026") != nullptr &&
            recordOfType(message, "x-hunt:2026") != nullptr,
        "repair keeps invalid bytes and valid same-year record");
  check(message.records[0].typeLength == 1 &&
            memcmp(typeBytes(&message, &message.records[0]), "U", 1) == 0 &&
            message.records[1].typeLength == strlen("x-hunt-invalid:2026") &&
            message.records[2].typeLength == strlen("x-hunt:2026"),
        "repair preserves opaque record ordering");
  const Record* invalid = recordOfType(message, "x-hunt-invalid:2026");
  check(invalid != nullptr && invalid->payloadLength == 2 &&
            payloadBytes(&message, invalid)[0] == 1 &&
            payloadBytes(&message, invalid)[1] == 2,
        "repair preserves malformed payload bytes");
  LedgerRead read;
  inspect(&message, &read);
  check(read.huntCount == 1 && read.hunts[0].mask == 3,
        "repair writes the requested spot into the valid year");

  size_t tooSmall = outputLength - 1;
  check(planSpotWrite(WandFixtures::repairKeepsValidSameYearFixture.data,
                      WandFixtures::repairKeepsValidSameYearFixture.length, 2026,
                      2, parseStorage, sizeof(parseStorage), planStorage,
                      sizeof(planStorage), output, tooSmall, &outputLength,
                      nullptr) == kOverflow &&
            outputLength > tooSmall,
        "capacity boundary reports required output size");

  check(planSpotWrite(WandFixtures::repairCreatesMissingYearFixture.data,
                      WandFixtures::repairCreatesMissingYearFixture.length, 2026,
                      1, parseStorage, sizeof(parseStorage), planStorage,
                      sizeof(planStorage), output, sizeof(output), &outputLength,
                      nullptr) == kOk,
        "invalid-only year is repaired and recreated");
  check(parseMessage(output, outputLength, &message, storage) &&
            message.recordCount == 4 &&
            recordOfType(message, "x-hunt-invalid:2026") != nullptr &&
            recordOfType(message, "x-hunt:2026") != nullptr,
        "invalid-only year gets a fresh canonical record");
}

void testNonTargetDuplicateMerge() {
  const uint8_t metadata[] = {7, 234, 3, 'A', 'd', 'a'};
  const uint8_t firstMask[] = {0, 0, 0, 0, 0, 0, 0, 8};
  const uint8_t secondMask[] = {0, 0, 0, 0, 0, 0, 0, 16};
  RawBuilder input;
  input.add("record-1", 0x05, nullptr, 0);
  input.add("x-hunt:2025", 0x02, firstMask, sizeof(firstMask));
  input.add("x-hunt:2025", 0x02, secondMask, sizeof(secondMask));
  input.add("x-hunt-meta", 0x02, metadata, sizeof(metadata));
  input.finish();

  uint8_t parseStorage[kMaxMessageBytes] = {0};
  uint8_t planStorage[kMaxMessageBytes] = {0};
  uint8_t output[kMaxMessageBytes] = {0};
  size_t outputLength = 0;
  check(planSpotWrite(input.bytes, input.length, 2026, 1, parseStorage,
                      sizeof(parseStorage), planStorage, sizeof(planStorage),
                      output, sizeof(output), &outputLength, nullptr) == kOk,
        "non-target duplicate merge plan succeeds");

  uint8_t storage[kMaxMessageBytes] = {0};
  Message planned;
  check(parseMessage(output, outputLength, &planned, storage),
        "non-target duplicate merge output parses");
  LedgerRead read;
  inspect(&planned, &read);
  const int huntIndex = read.huntCount > 0 && read.hunts[0].year == 2025 ? 0 : 1;
  check(huntIndex >= 0 && read.hunts[huntIndex].mask == 24,
        "non-target duplicate hunt year remains OR-merged");
}

void testSemanticReadback() {
  uint8_t leftStorage[kMaxMessageBytes] = {0};
  uint8_t rightStorage[kMaxMessageBytes] = {0};
  Message left;
  Message right;
  check(parseMessage(WandFixtures::duplicateMergeFixture.data,
                     WandFixtures::duplicateMergeFixture.length, &left,
                     leftStorage),
        "left semantic fixture parses");
  uint8_t encoded[kMaxMessageBytes] = {0};
  size_t encodedLength = 0;
  check(encode(&left, encoded, sizeof(encoded), &encodedLength) == kOk &&
            parseMessage(encoded, encodedLength, &right, rightStorage) &&
            semanticallyEquivalent(&left, &right),
        "semantic readback comparison succeeds");
}

}  // namespace

int main() {
  testGeneratedFixture();
  testNdefFieldRoundTrip();
  testAliasesAndWriteProtection();
  testValidationAndRefusal();
  testRepairOrderingAndCapacity();
  testNonTargetDuplicateMerge();
  testSemanticReadback();
  if (failures != 0) {
    fprintf(stderr, "%d native wand codec test(s) failed.\n", failures);
    return 1;
  }
  puts("native wand codec tests passed");
  return 0;
}
