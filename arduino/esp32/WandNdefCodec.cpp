#include "WandNdefCodec.h"

#include <string.h>

namespace WandNdefCodec {
namespace {

constexpr uint8_t kMb = 0x80;
constexpr uint8_t kMe = 0x40;
constexpr uint8_t kSr = 0x10;
constexpr uint8_t kIl = 0x08;
constexpr uint8_t kTnfMask = 0x07;
constexpr uint8_t kMimeTnf = 0x02;

const char kMetaType[] = "x-hunt-meta";
const char kHuntPrefix[] = "x-hunt:";
const char kInvalidPrefix[] = "x-hunt-invalid:";

void clearRecord(Record* record) {
  memset(record, 0, sizeof(*record));
}

bool reserve(Message* message, size_t length, uint16_t* offset) {
  if (!message || !offset || length > UINT16_MAX ||
      message->storageUsed > message->storageCapacity ||
      length > message->storageCapacity - message->storageUsed) {
    return false;
  }
  *offset = static_cast<uint16_t>(message->storageUsed);
  message->storageUsed += length;
  return true;
}

bool copyField(Message* message, uint16_t* offset, uint16_t* length,
               const uint8_t* bytes, size_t byteCount) {
  if (byteCount > UINT16_MAX || !reserve(message, byteCount, offset)) {
    return false;
  }
  *length = static_cast<uint16_t>(byteCount);
  if (byteCount != 0) memcpy(message->storage + *offset, bytes, byteCount);
  return true;
}

bool copyRecord(const Message* source, const Record* sourceRecord,
                Message* destination, Record* destinationRecord) {
  if (!source || !sourceRecord || !destination || !destinationRecord ||
      destination->recordCount >= kMaxRecords) {
    return false;
  }
  clearRecord(destinationRecord);
  destinationRecord->flags = sourceRecord->flags;
  destinationRecord->tnf = sourceRecord->tnf;
  const uint8_t* type = typeBytes(source, sourceRecord);
  const uint8_t* id = idBytes(source, sourceRecord);
  const uint8_t* payload = payloadBytes(source, sourceRecord);
  if (!copyField(destination, &destinationRecord->typeOffset,
                 &destinationRecord->typeLength, type, sourceRecord->typeLength) ||
      !copyField(destination, &destinationRecord->idOffset,
                 &destinationRecord->idLength, id, sourceRecord->idLength) ||
      !copyField(destination, &destinationRecord->payloadOffset,
                 &destinationRecord->payloadLength, payload,
                 sourceRecord->payloadLength)) {
    return false;
  }
  ++destination->recordCount;
  return true;
}

bool appendRecord(Message* message, uint8_t flags, uint8_t tnf,
                  const uint8_t* type, size_t typeLength, const uint8_t* id,
                  size_t idLength, const uint8_t* payload,
                  size_t payloadLength, Record** outputRecord) {
  if (!message || message->recordCount >= kMaxRecords || typeLength > kMaxTypeBytes ||
      idLength > kMaxIdBytes) {
    return false;
  }
  Record* record = &message->records[message->recordCount];
  clearRecord(record);
  record->flags = flags;
  record->tnf = static_cast<uint8_t>(tnf & kTnfMask);
  if (!copyField(message, &record->typeOffset, &record->typeLength, type,
                 typeLength) ||
      !copyField(message, &record->idOffset, &record->idLength, id,
                 idLength) ||
      !copyField(message, &record->payloadOffset, &record->payloadLength,
                 payload, payloadLength)) {
    return false;
  }
  ++message->recordCount;
  if (outputRecord) *outputRecord = record;
  return true;
}

void addDiagnostic(Diagnostics* diagnostics, DiagnosticCode code,
                   size_t recordIndex, uint16_t year, size_t expected,
                   size_t actual) {
  if (!diagnostics || diagnostics->count >= sizeof(diagnostics->items) /
                                         sizeof(diagnostics->items[0])) {
    return;
  }
  Diagnostic* item = &diagnostics->items[diagnostics->count++];
  item->code = code;
  item->recordIndex = recordIndex > 255 ? 255 : static_cast<uint8_t>(recordIndex);
  item->year = year;
  item->expectedBytes = expected;
  item->actualBytes = actual;
}

bool equals(const uint8_t* left, size_t leftLength, const char* right) {
  const size_t rightLength = strlen(right);
  return leftLength == rightLength &&
         (rightLength == 0 || memcmp(left, right, rightLength) == 0);
}

bool startsWith(const uint8_t* value, size_t valueLength, const char* prefix,
                size_t* suffixOffset) {
  const size_t prefixLength = strlen(prefix);
  if (valueLength <= prefixLength ||
      memcmp(value, prefix, prefixLength) != 0) {
    return false;
  }
  if (suffixOffset) *suffixOffset = prefixLength;
  return true;
}

bool parseYear(const uint8_t* bytes, size_t length, uint16_t* year) {
  if (!bytes || length != 4 || !year) return false;
  uint16_t result = 0;
  for (size_t index = 0; index < 4; ++index) {
    if (bytes[index] < '0' || bytes[index] > '9') return false;
    result = static_cast<uint16_t>(result * 10 + bytes[index] - '0');
  }
  *year = result;
  return true;
}

bool ownedType(const Message* message, const Record* record, bool* metadata,
               uint16_t* year) {
  if (!message || !record || record->tnf != kMimeTnf) return false;
  const uint8_t* type = typeBytes(message, record);
  if (equals(type, record->typeLength, kMetaType)) {
    if (metadata) *metadata = true;
    return true;
  }
  size_t offset = 0;
  if (!startsWith(type, record->typeLength, kHuntPrefix, &offset) ||
      !parseYear(type + offset, record->typeLength - offset, year)) {
    return false;
  }
  if (metadata) *metadata = false;
  return true;
}

bool decodeMask(const Message* message, const Record* record, uint64_t* mask) {
  if (!message || !record || !mask || record->payloadLength != 8) return false;
  const uint8_t* payload = payloadBytes(message, record);
  uint64_t value = 0;
  for (size_t index = 0; index < 8; ++index) {
    value = (value << 8) | payload[index];
  }
  *mask = value;
  return true;
}

void writeMask(uint64_t mask, uint8_t payload[8]) {
  for (int index = 7; index >= 0; --index) {
    payload[index] = static_cast<uint8_t>(mask & 0xff);
    mask >>= 8;
  }
}

bool validUtf8(const uint8_t* bytes, size_t length) {
  size_t index = 0;
  while (index < length) {
    const uint8_t first = bytes[index++];
    if (first <= 0x7f) continue;
    size_t continuationCount = 0;
    uint32_t codepoint = 0;
    uint32_t minimum = 0;
    if (first >= 0xc2 && first <= 0xdf) {
      continuationCount = 1;
      codepoint = first & 0x1f;
      minimum = 0x80;
    } else if (first >= 0xe0 && first <= 0xef) {
      continuationCount = 2;
      codepoint = first & 0x0f;
      minimum = 0x800;
    } else if (first >= 0xf0 && first <= 0xf4) {
      continuationCount = 3;
      codepoint = first & 0x07;
      minimum = 0x10000;
    } else {
      return false;
    }
    if (index + continuationCount > length) return false;
    for (size_t count = 0; count < continuationCount; ++count) {
      const uint8_t next = bytes[index++];
      if ((next & 0xc0) != 0x80) return false;
      codepoint = (codepoint << 6) | (next & 0x3f);
    }
    if (codepoint < minimum || codepoint > 0x10ffff ||
        (codepoint >= 0xd800 && codepoint <= 0xdfff)) {
      return false;
    }
  }
  return true;
}

bool decodeMetadata(const Message* message, const Record* record,
                    uint16_t* creationYear, uint8_t* ownerName,
                    size_t* ownerNameLength) {
  if (!message || !record || record->payloadLength < 3 || !creationYear ||
      !ownerName || !ownerNameLength) {
    return false;
  }
  const uint8_t* payload = payloadBytes(message, record);
  const size_t nameLength = payload[2];
  if (nameLength > 127 || record->payloadLength != 3 + nameLength ||
      !validUtf8(payload + 3, nameLength)) {
    return false;
  }
  *creationYear = static_cast<uint16_t>((payload[0] << 8) | payload[1]);
  if (nameLength != 0) memcpy(ownerName, payload + 3, nameLength);
  *ownerNameLength = nameLength;
  return true;
}

bool metadataEqual(const LedgerRead* read, uint16_t year, const uint8_t* name,
                   size_t nameLength) {
  return read->metadataCreationYear == year &&
         read->metadataOwnerNameLength == nameLength &&
         (nameLength == 0 ||
          memcmp(read->metadataOwnerName, name, nameLength) == 0);
}

int findHunt(const LedgerRead* read, uint16_t year) {
  for (size_t index = 0; index < read->huntCount; ++index) {
    if (read->hunts[index].year == year) return static_cast<int>(index);
  }
  return -1;
}

uint8_t boundaryFlags(uint8_t flags, size_t index, size_t count) {
  flags = static_cast<uint8_t>(flags & ~(kMb | kMe));
  if (index == 0) flags |= kMb;
  if (index + 1 == count) flags |= kMe;
  return flags;
}

bool recordFieldsEqual(const Message* left, const Record* leftRecord,
                       const Message* right, const Record* rightRecord) {
  const uint8_t leftFlags = leftRecord->flags & ~(kMb | kMe);
  const uint8_t rightFlags = rightRecord->flags & ~(kMb | kMe);
  return leftFlags == rightFlags && leftRecord->tnf == rightRecord->tnf &&
         leftRecord->typeLength == rightRecord->typeLength &&
         leftRecord->idLength == rightRecord->idLength &&
         leftRecord->payloadLength == rightRecord->payloadLength &&
         (leftRecord->typeLength == 0 ||
          memcmp(typeBytes(left, leftRecord), typeBytes(right, rightRecord),
                 leftRecord->typeLength) == 0) &&
         (leftRecord->idLength == 0 ||
          memcmp(idBytes(left, leftRecord), idBytes(right, rightRecord),
                 leftRecord->idLength) == 0) &&
         (leftRecord->payloadLength == 0 ||
          memcmp(payloadBytes(left, leftRecord), payloadBytes(right, rightRecord),
                 leftRecord->payloadLength) == 0);
}

bool canonicalizeForComparison(const Message* input, Message* output) {
  LedgerRead read;
  if (inspect(input, &read) != kOk) return false;
  bool seen[kMaxHuntYears] = {false};
  for (size_t index = 0; index < input->recordCount; ++index) {
    const Record* record = &input->records[index];
    bool metadata = false;
    uint16_t year = 0;
    if (index == 0 || !ownedType(input, record, &metadata, &year) || metadata) {
      if (!copyRecord(input, record, output,
                      &output->records[output->recordCount])) return false;
      continue;
    }
    uint64_t mask = 0;
    if (!decodeMask(input, record, &mask)) {
      if (!copyRecord(input, record, output,
                      &output->records[output->recordCount])) return false;
      continue;
    }
    int huntIndex = findHunt(&read, year);
    if (huntIndex < 0) return false;
    if (seen[huntIndex]) continue;
    seen[huntIndex] = true;
    Record* canonical = nullptr;
    if (!copyRecord(input, record, output,
                    &output->records[output->recordCount])) return false;
    canonical = &output->records[output->recordCount - 1];
    writeMask(read.hunts[huntIndex].mask,
              output->storage + canonical->payloadOffset);
  }
  return true;
}

}  // namespace

void initMessage(Message* message, uint8_t* storage, size_t storageCapacity) {
  if (!message) return;
  message->storage = storage;
  message->storageCapacity = storageCapacity;
  message->storageUsed = 0;
  message->recordCount = 0;
}

void initDiagnostics(Diagnostics* diagnostics) {
  if (diagnostics) diagnostics->count = 0;
}

const uint8_t* typeBytes(const Message* message, const Record* record) {
  return message && record ? message->storage + record->typeOffset : nullptr;
}

const uint8_t* idBytes(const Message* message, const Record* record) {
  return message && record ? message->storage + record->idOffset : nullptr;
}

const uint8_t* payloadBytes(const Message* message, const Record* record) {
  return message && record ? message->storage + record->payloadOffset : nullptr;
}

Status parse(const uint8_t* input, size_t inputLength, Message* output) {
  if (!input || !output || !output->storage || inputLength == 0) {
    return kInvalidArgument;
  }
  initMessage(output, output->storage, output->storageCapacity);
  size_t offset = 0;
  bool sawMessageEnd = false;
  while (offset < inputLength) {
    if (output->recordCount >= kMaxRecords || offset >= inputLength) {
      return kTooManyRecords;
    }
    const uint8_t header = input[offset++];
    const bool first = (header & kMb) != 0;
    const bool last = (header & kMe) != 0;
    const bool shortRecord = (header & kSr) != 0;
    const bool hasId = (header & kIl) != 0;
    const uint8_t tnf = header & kTnfMask;
    if ((output->recordCount == 0) != first || (output->recordCount != 0 && first) ||
        (sawMessageEnd && !first)) {
      return kMalformedNdef;
    }
    if (offset >= inputLength) return kMalformedNdef;
    const size_t typeLength = input[offset++];
    uint32_t payloadLength = 0;
    if (shortRecord) {
      if (offset >= inputLength) return kMalformedNdef;
      payloadLength = input[offset++];
    } else {
      if (offset + 4 > inputLength) return kMalformedNdef;
      payloadLength = (static_cast<uint32_t>(input[offset]) << 24) |
                      (static_cast<uint32_t>(input[offset + 1]) << 16) |
                      (static_cast<uint32_t>(input[offset + 2]) << 8) |
                      input[offset + 3];
      offset += 4;
    }
    size_t idLength = 0;
    if (hasId) {
      if (offset >= inputLength) return kMalformedNdef;
      idLength = input[offset++];
    }
    if (typeLength > kMaxTypeBytes || idLength > kMaxIdBytes ||
        payloadLength > UINT16_MAX ||
        typeLength + idLength + payloadLength > inputLength - offset) {
      return kMalformedNdef;
    }
    Record* record = &output->records[output->recordCount];
    if (!appendRecord(output, header, tnf, input + offset, typeLength, nullptr,
                      0, nullptr, 0, nullptr)) {
      return kOverflow;
    }
    record = &output->records[output->recordCount - 1];
    if (idLength != 0 &&
        !copyField(output, &record->idOffset, &record->idLength,
                   input + offset + typeLength, idLength)) {
      return kOverflow;
    }
    if (payloadLength != 0 &&
        !copyField(output, &record->payloadOffset, &record->payloadLength,
                   input + offset + typeLength + idLength, payloadLength)) {
      return kOverflow;
    }
    offset += typeLength + idLength + payloadLength;
    if (last) {
      sawMessageEnd = true;
      if (offset != inputLength) return kMalformedNdef;
    }
  }
  return sawMessageEnd ? kOk : kMalformedNdef;
}

size_t encodedSize(const Message* message) {
  if (!message) return 0;
  size_t total = 0;
  for (size_t index = 0; index < message->recordCount; ++index) {
    const Record* record = &message->records[index];
    total += 2 + record->typeLength + record->idLength;
    total += (record->flags & kSr) ? 1 : 4;
    if (record->flags & kIl) total += 1;
    total += record->payloadLength;
  }
  return total;
}

Status encode(const Message* message, uint8_t* output, size_t outputCapacity,
              size_t* outputLength) {
  if (!message || !output || !outputLength || message->recordCount == 0) {
    return kInvalidArgument;
  }
  const size_t required = encodedSize(message);
  if (required > outputCapacity) {
    *outputLength = required;
    return kOverflow;
  }
  size_t offset = 0;
  for (size_t index = 0; index < message->recordCount; ++index) {
    const Record* record = &message->records[index];
    const bool shortRecord = (record->flags & kSr) != 0;
    if (shortRecord && record->payloadLength > 255) return kInvalidArgument;
    if (!(record->flags & kIl) && record->idLength != 0) return kInvalidArgument;
    output[offset++] = record->flags;
    output[offset++] = static_cast<uint8_t>(record->typeLength);
    if (shortRecord) {
      output[offset++] = static_cast<uint8_t>(record->payloadLength);
    } else {
      output[offset++] = static_cast<uint8_t>((record->payloadLength >> 24) & 0xff);
      output[offset++] = static_cast<uint8_t>((record->payloadLength >> 16) & 0xff);
      output[offset++] = static_cast<uint8_t>((record->payloadLength >> 8) & 0xff);
      output[offset++] = static_cast<uint8_t>(record->payloadLength & 0xff);
    }
    if (record->flags & kIl) output[offset++] = static_cast<uint8_t>(record->idLength);
    if (record->typeLength != 0) {
      memcpy(output + offset, typeBytes(message, record), record->typeLength);
      offset += record->typeLength;
    }
    if (record->idLength != 0) {
      memcpy(output + offset, idBytes(message, record), record->idLength);
      offset += record->idLength;
    }
    if (record->payloadLength != 0) {
      memcpy(output + offset, payloadBytes(message, record), record->payloadLength);
      offset += record->payloadLength;
    }
  }
  *outputLength = offset;
  return kOk;
}

Status inspect(const Message* message, LedgerRead* output) {
  if (!message || !output) return kInvalidArgument;
  memset(output, 0, sizeof(*output));
  output->metadataStatus = kMetadataStatusMissing;
  size_t validMetadata = 0;
  size_t malformedMetadata = 0;
  for (size_t index = 1; index < message->recordCount; ++index) {
    const Record* record = &message->records[index];
    bool metadata = false;
    uint16_t year = 0;
    if (!ownedType(message, record, &metadata, &year)) continue;
    if (metadata) {
      uint16_t creationYear = 0;
      uint8_t ownerName[127] = {0};
      size_t ownerNameLength = 0;
      if (!decodeMetadata(message, record, &creationYear, ownerName,
                          &ownerNameLength)) {
        ++malformedMetadata;
        addDiagnostic(&output->diagnostics, kMetadataMalformed, index, 0, 0,
                      record->payloadLength);
        continue;
      }
      if (validMetadata == 0) {
        output->metadataCreationYear = creationYear;
        output->metadataOwnerNameLength = ownerNameLength;
        if (ownerNameLength != 0) {
          memcpy(output->metadataOwnerName, ownerName, ownerNameLength);
        }
      }
      ++validMetadata;
      continue;
    }

    uint64_t mask = 0;
    if (!decodeMask(message, record, &mask)) {
      addDiagnostic(&output->diagnostics, kHuntPayloadInvalid, index, year, 8,
                    record->payloadLength);
      continue;
    }
    const int huntIndex = findHunt(output, year);
    if (huntIndex >= 0) {
      output->hunts[huntIndex].mask |= mask;
    } else if (output->huntCount < kMaxHuntYears) {
      output->hunts[output->huntCount].year = year;
      output->hunts[output->huntCount].mask = mask;
      ++output->huntCount;
    } else {
      return kOverflow;
    }
  }

  if (validMetadata == 0) {
    output->metadataStatus =
        malformedMetadata == 0 ? kMetadataStatusMissing : kMetadataStatusMalformed;
    if (malformedMetadata == 0) {
      addDiagnostic(&output->diagnostics, kMetadataMissing, 0, 0, 0, 0);
    }
  } else if (validMetadata == 1 && malformedMetadata == 0) {
    output->metadataStatus = kMetadataStatusValid;
  } else if (validMetadata > 1) {
    bool conflicting = false;
    for (size_t index = 1; index < message->recordCount; ++index) {
      const Record* record = &message->records[index];
      bool metadata = false;
      uint16_t year = 0;
      if (!ownedType(message, record, &metadata, &year) || !metadata) continue;
      uint16_t creationYear = 0;
      uint8_t ownerName[127] = {0};
      size_t ownerNameLength = 0;
      if (decodeMetadata(message, record, &creationYear, ownerName,
                         &ownerNameLength) &&
          !metadataEqual(output, creationYear, ownerName, ownerNameLength)) {
        conflicting = true;
      }
    }
    output->metadataStatus =
        conflicting ? kMetadataStatusConflicting : kMetadataStatusDuplicate;
    addDiagnostic(&output->diagnostics,
                  conflicting ? kMetadataConflicting : kMetadataDuplicate, 0, 0,
                  0, 0);
  } else {
    output->metadataStatus = kMetadataStatusMalformed;
  }
  return kOk;
}

Status planSpotWrite(const uint8_t* input, size_t inputLength, uint16_t year,
                     uint8_t spotId, uint8_t* parseStorage,
                     size_t parseStorageCapacity, uint8_t* planStorage,
                     size_t planStorageCapacity, uint8_t* output,
                     size_t outputCapacity, size_t* outputLength,
                     Diagnostics* diagnostics) {
  if (year > 9999) return kInvalidYear;
  if (spotId < 1 || spotId > 64) return kInvalidSpotId;
  if (!parseStorage || !planStorage || !output || !outputLength) {
    return kInvalidArgument;
  }
  Message source;
  initMessage(&source, parseStorage, parseStorageCapacity);
  Status status = parse(input, inputLength, &source);
  if (status != kOk) return status;
  LedgerRead read;
  status = inspect(&source, &read);
  if (status != kOk) return status;
  if (read.metadataStatus != kMetadataStatusValid) {
    if (diagnostics) *diagnostics = read.diagnostics;
    return kMetadataRequired;
  }

  Message planned;
  initMessage(&planned, planStorage, planStorageCapacity);
  uint64_t targetMask = 1ULL << (spotId - 1);
  int targetHuntIndex = findHunt(&read, year);
  if (targetHuntIndex >= 0) targetMask |= read.hunts[targetHuntIndex].mask;
  bool emitted[kMaxHuntYears] = {false};
  for (size_t index = 0; index < source.recordCount; ++index) {
    const Record* record = &source.records[index];
    bool metadata = false;
    uint16_t recordYear = 0;
    const bool isOwned = index > 0 && ownedType(&source, record, &metadata, &recordYear);
    if (!isOwned || metadata) {
      if (!copyRecord(&source, record, &planned,
                      &planned.records[planned.recordCount])) {
        return kOverflow;
      }
      continue;
    }

    uint64_t mask = 0;
    const bool validPayload = decodeMask(&source, record, &mask);
    const int huntIndex = findHunt(&read, recordYear);
    if (!validPayload) {
      Record* repaired = nullptr;
      const char* prefix = kInvalidPrefix;
      char type[32] = {0};
      const size_t prefixLength = strlen(prefix);
      const size_t yearLength = 4;
      if (prefixLength + yearLength > sizeof(type)) return kOverflow;
      memcpy(type, prefix, prefixLength);
      type[prefixLength + 0] = static_cast<char>('0' + (recordYear / 1000) % 10);
      type[prefixLength + 1] = static_cast<char>('0' + (recordYear / 100) % 10);
      type[prefixLength + 2] = static_cast<char>('0' + (recordYear / 10) % 10);
      type[prefixLength + 3] = static_cast<char>('0' + recordYear % 10);
      if (!appendRecord(&planned, boundaryFlags(record->flags, planned.recordCount,
                                                 source.recordCount + 1),
                        record->tnf, reinterpret_cast<const uint8_t*>(type),
                        prefixLength + yearLength, idBytes(&source, record),
                        record->idLength, payloadBytes(&source, record),
                        record->payloadLength, &repaired)) {
        return kOverflow;
      }
      (void)repaired;
      addDiagnostic(diagnostics, kHuntPayloadInvalid, index, recordYear, 8,
                    record->payloadLength);
      continue;
    }
    if (huntIndex < 0 || emitted[huntIndex]) continue;
    emitted[huntIndex] = true;
    mask = read.hunts[huntIndex].mask;
    if (recordYear == year) mask = targetMask;
    uint8_t payload[8] = {0};
    writeMask(mask, payload);
    const size_t typeLength = record->typeLength;
    if (!appendRecord(&planned,
                      boundaryFlags(record->flags, planned.recordCount,
                                    source.recordCount + 1),
                      record->tnf, typeBytes(&source, record), typeLength,
                      idBytes(&source, record), record->idLength, payload, 8,
                      nullptr)) {
      return kOverflow;
    }
  }
  if (!emitted[targetHuntIndex >= 0 ? targetHuntIndex : 0] ||
      targetHuntIndex < 0) {
    char type[16] = "x-hunt:";
    type[7] = static_cast<char>('0' + (year / 1000) % 10);
    type[8] = static_cast<char>('0' + (year / 100) % 10);
    type[9] = static_cast<char>('0' + (year / 10) % 10);
    type[10] = static_cast<char>('0' + year % 10);
    uint8_t payload[8] = {0};
    writeMask(targetMask, payload);
    if (!appendRecord(&planned,
                      boundaryFlags(kSr | kMimeTnf, planned.recordCount,
                                    planned.recordCount + 1),
                      kMimeTnf, reinterpret_cast<const uint8_t*>(type), 11,
                      nullptr, 0, payload, 8, nullptr)) {
      return kOverflow;
    }
  }
  for (size_t index = 0; index < planned.recordCount; ++index) {
    planned.records[index].flags =
        boundaryFlags(planned.records[index].flags, index, planned.recordCount);
  }
  status = encode(&planned, output, outputCapacity, outputLength);
  if (diagnostics && diagnostics->count == 0) *diagnostics = read.diagnostics;
  return status;
}

bool semanticallyEquivalent(const Message* left, const Message* right) {
  if (!left || !right) return false;
  uint8_t leftStorage[kMaxMessageBytes] = {0};
  uint8_t rightStorage[kMaxMessageBytes] = {0};
  Message leftCanonical;
  Message rightCanonical;
  initMessage(&leftCanonical, leftStorage, sizeof(leftStorage));
  initMessage(&rightCanonical, rightStorage, sizeof(rightStorage));
  if (!canonicalizeForComparison(left, &leftCanonical) ||
      !canonicalizeForComparison(right, &rightCanonical) ||
      leftCanonical.recordCount != rightCanonical.recordCount) {
    return false;
  }
  for (size_t index = 0; index < leftCanonical.recordCount; ++index) {
    if (!recordFieldsEqual(&leftCanonical, &leftCanonical.records[index],
                           &rightCanonical, &rightCanonical.records[index])) {
      return false;
    }
  }
  return true;
}

}  // namespace WandNdefCodec
