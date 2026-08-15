#ifndef WAND_NDEF_CODEC_H
#define WAND_NDEF_CODEC_H

#include <stddef.h>
#include <stdint.h>

namespace WandNdefCodec {

constexpr size_t kMaxMessageBytes = 888;
constexpr size_t kMaxRecords = 32;
constexpr size_t kMaxTypeBytes = 64;
constexpr size_t kMaxIdBytes = 64;
constexpr size_t kMaxHuntYears = 32;

enum Status {
  kOk = 0,
  kInvalidArgument,
  kMalformedNdef,
  kTooManyRecords,
  kOverflow,
  kMetadataRequired,
  kInvalidYear,
  kInvalidSpotId,
  kInvalidMetadata,
};

struct Record {
  uint8_t flags;
  uint8_t tnf;
  uint16_t typeOffset;
  uint16_t typeLength;
  uint16_t idOffset;
  uint16_t idLength;
  uint16_t payloadOffset;
  uint16_t payloadLength;
};

struct Message {
  uint8_t* storage;
  size_t storageCapacity;
  size_t storageUsed;
  Record records[kMaxRecords];
  size_t recordCount;
};

enum DiagnosticCode {
  kMetadataMissing,
  kMetadataMalformed,
  kMetadataDuplicate,
  kMetadataConflicting,
  kHuntPayloadInvalid,
};

struct Diagnostic {
  DiagnosticCode code;
  uint8_t recordIndex;
  uint16_t year;
  size_t expectedBytes;
  size_t actualBytes;
};

struct Diagnostics {
  Diagnostic items[kMaxRecords + 2];
  size_t count;
};

enum MetadataStatus {
  kMetadataStatusMissing,
  kMetadataStatusMalformed,
  kMetadataStatusDuplicate,
  kMetadataStatusConflicting,
  kMetadataStatusValid,
};

struct HuntState {
  uint16_t year;
  uint64_t mask;
};

struct LedgerRead {
  MetadataStatus metadataStatus;
  uint16_t metadataCreationYear;
  uint8_t metadataOwnerName[127];
  size_t metadataOwnerNameLength;
  HuntState hunts[kMaxHuntYears];
  size_t huntCount;
  Diagnostics diagnostics;
};

void initMessage(Message* message, uint8_t* storage, size_t storageCapacity);
void initDiagnostics(Diagnostics* diagnostics);

Status parse(const uint8_t* input, size_t inputLength, Message* output);
Status encode(const Message* message, uint8_t* output, size_t outputCapacity,
              size_t* outputLength);
size_t encodedSize(const Message* message);

const uint8_t* typeBytes(const Message* message, const Record* record);
const uint8_t* idBytes(const Message* message, const Record* record);
const uint8_t* payloadBytes(const Message* message, const Record* record);

Status inspect(const Message* message, LedgerRead* output);

Status planSpotWrite(const uint8_t* input, size_t inputLength, uint16_t year,
                     uint8_t spotId, uint8_t* parseStorage,
                     size_t parseStorageCapacity, uint8_t* planStorage,
                     size_t planStorageCapacity, uint8_t* output,
                     size_t outputCapacity, size_t* outputLength,
                     Diagnostics* diagnostics);

bool semanticallyEquivalent(const Message* left, const Message* right);

}  // namespace WandNdefCodec

#endif
