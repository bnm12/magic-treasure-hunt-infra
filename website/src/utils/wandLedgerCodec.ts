import type { NfcRecord } from "../composables/nfcSession";

const HUNT_RECORD_PATTERN = /^x-hunt:([0-9]{4})$/;
const INVALID_HUNT_RECORD_PATTERN = /^x-hunt-invalid:([0-9]{4})$/;
const METADATA_RECORD_TYPE = "x-hunt-meta";
const HUNT_PAYLOAD_LENGTH = 8;

type OwnedRepresentation = "direct" | "mime";
export type LogicalOwnedType =
  | { kind: "metadata"; representation: OwnedRepresentation }
  | { kind: "hunt"; year: number; representation: OwnedRepresentation };

export interface NormalizedNfcRecord {
  recordType: string;
  mediaType?: string;
  id?: string;
  encoding?: string;
  lang?: string;
  data: Uint8Array;
  records?: NormalizedNfcRecord[];
}

export interface WandMetadata {
  creationYear: number;
  ownerName: string;
}

export type WandDiagnosticCode =
  | "metadata-missing"
  | "metadata-malformed"
  | "metadata-duplicate"
  | "metadata-conflicting"
  | "hunt-payload-invalid";

export interface WandDiagnostic {
  code: WandDiagnosticCode;
  severity: "error" | "warning";
  recordIndex?: number;
  year?: number;
  details?: Readonly<Record<string, string | number>>;
}

export type WandMetadataStatus =
  | "valid"
  | "missing"
  | "malformed"
  | "duplicate"
  | "conflicting";

export interface WandLedgerRead {
  records: NormalizedNfcRecord[];
  metadata: WandMetadata | null;
  metadataStatus: WandMetadataStatus;
  hunts: Record<number, number[]>;
  diagnostics: WandDiagnostic[];
}

export interface WandRepairAction {
  recordIndex: number;
  year: number;
  fromRecordType: string;
  toRecordType: string;
}

export type WandWriteOperation =
  | {
      kind: "record1";
      record: NormalizedNfcRecord;
    }
  | {
      kind: "spot";
      year: number;
      spotId: number;
    };

export interface WandWriteOptions {
  capacityBytes?: number;
}

export interface WandWritePlan {
  records: NormalizedNfcRecord[];
  diagnostics: WandDiagnostic[];
  repairs: WandRepairAction[];
  estimatedBytes: number;
}

export function semanticallyEquivalentWandRecords(
  left: readonly NormalizedNfcRecord[],
  right: readonly NormalizedNfcRecord[],
): boolean {
  const normalizeForComparison = (
    records: readonly NormalizedNfcRecord[],
  ): string => {
    const canonical = canonicalizeHunts(records, undefined, undefined).records;
    return JSON.stringify(
      canonical.map((record) => ({
        recordType: record.recordType,
        mediaType: record.mediaType,
        id: record.id,
        encoding: record.encoding,
        lang: record.lang,
        data: [...record.data],
        records: record.records
          ? JSON.parse(normalizeForComparison(record.records))
          : undefined,
      })),
    );
  };

  return normalizeForComparison(left) === normalizeForComparison(right);
}

export type WandCodecErrorCode =
  | "metadata-required"
  | "invalid-year"
  | "invalid-spot-id"
  | "invalid-owner-name"
  | "invalid-metadata-year"
  | "capacity-exceeded";

export class WandCodecError extends Error {
  readonly code: WandCodecErrorCode;
  readonly diagnostics: WandDiagnostic[];

  constructor(
    code: WandCodecErrorCode,
    message: string,
    diagnostics: WandDiagnostic[] = [],
  ) {
    super(message);
    this.name = "WandCodecError";
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

function copyBytes(data: Uint8Array | ArrayBuffer | undefined): Uint8Array {
  if (!data) return new Uint8Array();
  if (data instanceof Uint8Array) return data.slice();
  return new Uint8Array(data.slice(0));
}

function copyRecord(record: NormalizedNfcRecord): NormalizedNfcRecord {
  return {
    recordType: record.recordType,
    ...(record.mediaType === undefined ? {} : { mediaType: record.mediaType }),
    ...(record.id === undefined ? {} : { id: record.id }),
    ...(record.encoding === undefined ? {} : { encoding: record.encoding }),
    ...(record.lang === undefined ? {} : { lang: record.lang }),
    data: record.data.slice(),
    ...(record.records
      ? { records: record.records.map(copyRecord) }
      : {}),
  };
}

function isBufferSource(value: unknown): value is ArrayBuffer | ArrayBufferView {
  return (
    value instanceof ArrayBuffer ||
    (typeof value === "object" &&
      value !== null &&
      ArrayBuffer.isView(value))
  );
}

function bytesFromBufferSource(value: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (value instanceof ArrayBuffer) return new Uint8Array(value.slice(0));
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength).slice();
}

function isNestedMessage(
  value: unknown,
): value is { records: NDEFRecordInit[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "records" in value &&
    Array.isArray(value.records)
  );
}

function bytesFromInitData(
  data: NDEFRecordInit["data"],
): { data: Uint8Array; records?: NormalizedNfcRecord[] } {
  if (typeof data === "string") {
    return { data: new TextEncoder().encode(data) };
  }
  if (isNestedMessage(data)) {
    return {
      data: new Uint8Array(),
      records: data.records.map(normalizeNdefRecordInit),
    };
  }
  if (isBufferSource(data)) {
    return { data: bytesFromBufferSource(data) };
  }
  return { data: new Uint8Array() };
}

export function normalizeNfcRecord(record: NfcRecord): NormalizedNfcRecord {
  return {
    recordType: record.recordType,
    ...(record.mediaType === undefined ? {} : { mediaType: record.mediaType }),
    ...(record.id === undefined ? {} : { id: record.id }),
    ...(record.encoding === undefined ? {} : { encoding: record.encoding }),
    ...(record.lang === undefined ? {} : { lang: record.lang }),
    data: copyBytes(record.data),
    ...(record.records
      ? { records: record.records.map(normalizeNfcRecord) }
      : {}),
  };
}

export function normalizeNfcRecords(
  records: readonly NfcRecord[],
): NormalizedNfcRecord[] {
  return records.map(normalizeNfcRecord);
}

export function normalizeNdefRecordInit(
  record: NDEFRecordInit,
): NormalizedNfcRecord {
  const payload = bytesFromInitData(record.data);
  return {
    recordType: record.recordType,
    ...(record.mediaType === undefined ? {} : { mediaType: record.mediaType }),
    ...(record.id === undefined ? {} : { id: record.id }),
    ...(record.encoding === undefined ? {} : { encoding: record.encoding }),
    ...(record.lang === undefined ? {} : { lang: record.lang }),
    data: payload.data,
    ...(payload.records ? { records: payload.records } : {}),
  };
}

export function toNdefRecordInit(
  record: NormalizedNfcRecord,
): NDEFRecordInit {
  const data = record.records
    ? {
        records: record.records.map(toNdefRecordInit),
      }
    : record.data.slice().buffer;

  return {
    recordType: record.recordType,
    ...(record.mediaType === undefined ? {} : { mediaType: record.mediaType }),
    ...(record.id === undefined ? {} : { id: record.id }),
    ...(record.encoding === undefined ? {} : { encoding: record.encoding }),
    ...(record.lang === undefined ? {} : { lang: record.lang }),
    data,
  };
}

export function logicalOwnedType(
  record: NormalizedNfcRecord,
): LogicalOwnedType | null {
  if (record.recordType === "mime") {
    if (record.mediaType === METADATA_RECORD_TYPE) {
      return { kind: "metadata", representation: "mime" };
    }
    const mimeMatch = record.mediaType
      ? HUNT_RECORD_PATTERN.exec(record.mediaType)
      : null;
    return mimeMatch
      ? {
          kind: "hunt",
          year: Number(mimeMatch[1]),
          representation: "mime",
        }
      : null;
  }

  if (record.recordType === METADATA_RECORD_TYPE) {
    return { kind: "metadata", representation: "direct" };
  }
  const directMatch = HUNT_RECORD_PATTERN.exec(record.recordType);
  return directMatch
    ? {
        kind: "hunt",
        year: Number(directMatch[1]),
        representation: "direct",
      }
    : null;
}

function preferredRepresentation(
  records: readonly NormalizedNfcRecord[],
): OwnedRepresentation {
  for (let index = 1; index < records.length; index += 1) {
    const ownedType = records[index] ? logicalOwnedType(records[index]) : null;
    if (ownedType) return ownedType.representation;
  }
  return "direct";
}

function decodeHuntMask(data: Uint8Array): bigint | null {
  if (data.length !== HUNT_PAYLOAD_LENGTH) return null;
  let mask = 0n;
  for (const byte of data) {
    mask = (mask << 8n) | BigInt(byte);
  }
  return mask;
}

function maskToSpotIds(mask: bigint): number[] {
  const spotIds: number[] = [];
  for (let index = 0; index < 64; index += 1) {
    if ((mask & (1n << BigInt(index))) !== 0n) {
      spotIds.push(index + 1);
    }
  }
  return spotIds;
}

function maskToBytes(mask: bigint): Uint8Array {
  const data = new Uint8Array(HUNT_PAYLOAD_LENGTH);
  for (let index = 0; index < HUNT_PAYLOAD_LENGTH; index += 1) {
    const shift = BigInt((HUNT_PAYLOAD_LENGTH - index - 1) * 8);
    data[index] = Number((mask >> shift) & 0xffn);
  }
  return data;
}

function decodeMetadata(
  record: NormalizedNfcRecord,
): WandMetadata | null {
  if (record.data.length < 3) return null;
  const nameLength = record.data[2];
  if (nameLength > 127) return null;
  if (record.data.length !== 3 + nameLength) return null;

  const creationYear = (record.data[0] << 8) | record.data[1];
  try {
    const ownerName = new TextDecoder("utf-8", { fatal: true }).decode(
      record.data.slice(3),
    );
    return { creationYear, ownerName };
  } catch (error: unknown) {
    if (error instanceof TypeError) return null;
    throw error;
  }
}

function encodeMetadata(ownerName: string, creationYear: number): Uint8Array {
  const nameBytes = new TextEncoder().encode(ownerName);
  if (nameBytes.length > 127) {
    throw new WandCodecError(
      "invalid-owner-name",
      "Owner name must be at most 127 UTF-8 bytes.",
    );
  }

  try {
    const roundTrip = new TextDecoder("utf-8", { fatal: true }).decode(nameBytes);
    if (roundTrip !== ownerName) {
      throw new WandCodecError(
        "invalid-owner-name",
        "Owner name must be valid UTF-8 text.",
      );
    }
  } catch (error: unknown) {
    if (error instanceof WandCodecError) throw error;
    if (error instanceof TypeError) {
      throw new WandCodecError(
        "invalid-owner-name",
        "Owner name must be valid UTF-8 text.",
      );
    }
    throw error;
  }

  const payload = new Uint8Array(3 + nameBytes.length);
  payload[0] = (creationYear >> 8) & 0xff;
  payload[1] = creationYear & 0xff;
  payload[2] = nameBytes.length;
  payload.set(nameBytes, 3);
  return payload;
}

function metadataDiagnostic(
  code: WandDiagnosticCode,
  recordIndex?: number,
): WandDiagnostic {
  return {
    code,
    severity: "error",
    ...(recordIndex === undefined ? {} : { recordIndex }),
  };
}

export function decodeWandRecords(
  inputRecords: readonly NormalizedNfcRecord[],
): WandLedgerRead {
  const records = inputRecords.map(copyRecord);
  const diagnostics: WandDiagnostic[] = [];
  const validMetadata: Array<{ record: WandMetadata; index: number }> = [];
  const malformedMetadataIndexes: number[] = [];
  const masks = new Map<number, bigint>();

  for (let index = 1; index < records.length; index += 1) {
    const record = records[index];
    if (!record) continue;

    const ownedType = logicalOwnedType(record);
    if (ownedType?.kind === "metadata") {
      const metadata = decodeMetadata(record);
      if (!metadata) {
        malformedMetadataIndexes.push(index);
        diagnostics.push(metadataDiagnostic("metadata-malformed", index));
      } else {
        validMetadata.push({ record: metadata, index });
      }
      continue;
    }

    if (ownedType?.kind !== "hunt") continue;
    const year = ownedType.year;

    const mask = decodeHuntMask(record.data);
    if (mask === null) {
      diagnostics.push({
        code: "hunt-payload-invalid",
        severity: "warning",
        recordIndex: index,
        year,
        details: { expectedBytes: HUNT_PAYLOAD_LENGTH, actualBytes: record.data.length },
      });
      continue;
    }

    masks.set(year, (masks.get(year) ?? 0n) | mask);
  }

  let metadataStatus: WandMetadataStatus;
  let metadata: WandMetadata | null = null;
  if (validMetadata.length === 0) {
    metadataStatus = malformedMetadataIndexes.length > 0 ? "malformed" : "missing";
    if (metadataStatus === "missing") diagnostics.push(metadataDiagnostic("metadata-missing"));
  } else if (validMetadata.length === 1 && malformedMetadataIndexes.length === 0) {
    metadataStatus = "valid";
    metadata = validMetadata[0]?.record ?? null;
  } else if (validMetadata.length > 1) {
    const first = validMetadata[0]?.record;
    const conflicting = validMetadata.some(
      ({ record }) =>
        record.creationYear !== first?.creationYear ||
        record.ownerName !== first?.ownerName,
    );
    metadataStatus = conflicting ? "conflicting" : "duplicate";
    diagnostics.push(
      metadataDiagnostic(
        conflicting ? "metadata-conflicting" : "metadata-duplicate",
      ),
    );
  } else {
    metadataStatus = "malformed";
  }

  const hunts: Record<number, number[]> = {};
  for (const [year, mask] of masks) {
    hunts[year] = maskToSpotIds(mask);
  }

  return { records, metadata, metadataStatus, hunts, diagnostics };
}

function isValidRecordYear(year: number): boolean {
  return Number.isInteger(year) && year >= 0 && year <= 9999;
}

function requireRecordYear(year: number): void {
  if (!isValidRecordYear(year)) {
    throw new WandCodecError(
      "invalid-year",
      "Hunt year must be an integer from 0 through 9999.",
    );
  }
}

function requireSpotId(spotId: number): void {
  if (!Number.isInteger(spotId) || spotId < 1 || spotId > 64) {
    throw new WandCodecError(
      "invalid-spot-id",
      "Spot ID must be an integer from 1 through 64.",
    );
  }
}

function estimateRecordBytes(record: NormalizedNfcRecord): number {
  const textBytes = (value: string | undefined): number =>
    value ? new TextEncoder().encode(value).length : 0;
  const nestedBytes = record.records
    ? record.records.reduce((total, nested) => total + estimateRecordBytes(nested), 0)
    : record.data.length;

  return (
    4 +
    textBytes(record.recordType) +
    textBytes(record.mediaType) +
    textBytes(record.id) +
    textBytes(record.encoding) +
    textBytes(record.lang) +
    nestedBytes
  );
}

export function estimateWandMessageBytes(
  records: readonly NormalizedNfcRecord[],
): number {
  return 2 + records.reduce((total, record) => total + estimateRecordBytes(record), 0);
}

function ensureCapacity(
  records: NormalizedNfcRecord[],
  options: WandWriteOptions,
): number {
  const estimatedBytes = estimateWandMessageBytes(records);
  if (
    options.capacityBytes !== undefined &&
    (!Number.isInteger(options.capacityBytes) || options.capacityBytes < 0)
  ) {
    throw new WandCodecError(
      "capacity-exceeded",
      "Capacity must be a non-negative integer byte limit.",
    );
  }
  if (
    options.capacityBytes !== undefined &&
    estimatedBytes > options.capacityBytes
  ) {
    throw new WandCodecError(
      "capacity-exceeded",
      `Wand message needs ${estimatedBytes} bytes but capacity is ${options.capacityBytes} bytes.`,
    );
  }
  return estimatedBytes;
}

function canonicalHuntRecord(
  source: NormalizedNfcRecord,
  year: number,
  mask: bigint,
  representation: OwnedRepresentation,
): NormalizedNfcRecord {
  const result = copyRecord(source);
  const type = `x-hunt:${year.toString().padStart(4, "0")}`;
  if (representation === "mime") {
    result.recordType = "mime";
    result.mediaType = type;
  } else {
    result.recordType = type;
    delete result.mediaType;
  }
  result.data = maskToBytes(mask);
  return result;
}

function canonicalizeHunts(
  records: readonly NormalizedNfcRecord[],
  targetYear: number | undefined,
  targetSpotId: number | undefined,
): {
  records: NormalizedNfcRecord[];
  diagnostics: WandDiagnostic[];
  repairs: WandRepairAction[];
} {
  const masks = new Map<number, bigint>();
  const firstRecords = new Map<number, NormalizedNfcRecord>();
  const firstRepresentations = new Map<number, OwnedRepresentation>();
  const diagnostics: WandDiagnostic[] = [];
  const repairs: WandRepairAction[] = [];
  const defaultRepresentation = preferredRepresentation(records);

  for (let index = 1; index < records.length; index += 1) {
    const record = records[index];
    if (!record) continue;
    const ownedType = logicalOwnedType(record);
    if (ownedType?.kind !== "hunt") continue;
    const year = ownedType.year;
    const mask = decodeHuntMask(record.data);
    if (mask === null) continue;
    masks.set(year, (masks.get(year) ?? 0n) | mask);
    if (!firstRecords.has(year)) firstRecords.set(year, record);
    if (!firstRepresentations.has(year)) {
      firstRepresentations.set(year, ownedType.representation);
    }
  }

  if (targetYear !== undefined && targetSpotId !== undefined) {
    const bit = 1n << BigInt(targetSpotId - 1);
    masks.set(targetYear, (masks.get(targetYear) ?? 0n) | bit);
  }

  const output: NormalizedNfcRecord[] = [];
  const emittedYears = new Set<number>();
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (!record) continue;

    if (index === 0) {
      output.push(copyRecord(record));
      continue;
    }

    const ownedType = logicalOwnedType(record);
    if (ownedType?.kind === "hunt") {
      const year = ownedType.year;
      const mask = decodeHuntMask(record.data);
      if (mask === null) {
        const repairedType = `x-hunt-invalid:${year.toString().padStart(4, "0")}`;
        const repairedRecord = copyRecord(record);
        if (ownedType.representation === "mime") {
          repairedRecord.recordType = "mime";
          repairedRecord.mediaType = repairedType;
        } else {
          repairedRecord.recordType = repairedType;
          delete repairedRecord.mediaType;
        }
        output.push(repairedRecord);
        repairs.push({
          recordIndex: index,
          year,
          fromRecordType: record.recordType,
          toRecordType: repairedType,
        });
        diagnostics.push({
          code: "hunt-payload-invalid",
          severity: "warning",
          recordIndex: index,
          year,
        });
        continue;
      }
      if (emittedYears.has(year)) continue;
      emittedYears.add(year);
      output.push(
        canonicalHuntRecord(
          firstRecords.get(year) ?? record,
          year,
          masks.get(year) ?? mask,
          firstRepresentations.get(year) ?? ownedType.representation,
        ),
      );
      continue;
    }

    output.push(copyRecord(record));
  }

  if (targetYear !== undefined && !emittedYears.has(targetYear)) {
    const targetType = `x-hunt:${targetYear.toString().padStart(4, "0")}`;
    const representation =
      firstRepresentations.get(targetYear) ?? defaultRepresentation;
    const freshRecord: NormalizedNfcRecord =
      representation === "mime"
        ? {
            recordType: "mime",
            mediaType: targetType,
            data: maskToBytes(masks.get(targetYear) ?? 0n),
          }
        : {
            recordType: targetType,
            data: maskToBytes(masks.get(targetYear) ?? 0n),
          };
    output.push(freshRecord);
    emittedYears.add(targetYear);
  }

  return { records: output, diagnostics, repairs };
}

function requireValidMetadata(read: WandLedgerRead): void {
  if (read.metadataStatus === "valid") return;
  throw new WandCodecError(
    "metadata-required",
    "Exactly one valid x-hunt-meta record is required before a wand spot write.",
    read.diagnostics,
  );
}

export function buildWandWritePlan(
  inputRecords: readonly NormalizedNfcRecord[],
  operation: WandWriteOperation,
  options: WandWriteOptions = {},
): WandWritePlan {
  const records = inputRecords.map(copyRecord);
  let resultRecords: NormalizedNfcRecord[];
  let diagnostics: WandDiagnostic[] = [];
  let repairs: WandRepairAction[] = [];

  if (operation.kind === "record1") {
    resultRecords =
      records.length === 0
        ? [copyRecord(operation.record)]
        : [copyRecord(operation.record), ...records.slice(1).map(copyRecord)];
  } else {
    requireRecordYear(operation.year);
    requireSpotId(operation.spotId);
    const read = decodeWandRecords(records);
    requireValidMetadata(read);
    const canonicalized = canonicalizeHunts(
      records,
      operation.year,
      operation.spotId,
    );
    resultRecords = canonicalized.records;
    diagnostics = [...read.diagnostics, ...canonicalized.diagnostics];
    repairs = canonicalized.repairs;
  }

  return {
    records: resultRecords,
    diagnostics,
    repairs,
    estimatedBytes: ensureCapacity(resultRecords, options),
  };
}

export function buildInitializationWritePlan(
  record1: NormalizedNfcRecord,
  ownerName: string,
  creationYear: number,
  options: WandWriteOptions = {},
): WandWritePlan {
  if (!Number.isInteger(creationYear) || creationYear < 0 || creationYear > 0xffff) {
    throw new WandCodecError(
      "invalid-metadata-year",
      "Metadata creation year must be an unsigned 16-bit integer.",
    );
  }

  const records: NormalizedNfcRecord[] = [
    copyRecord(record1),
    {
      recordType: "mime",
      mediaType: METADATA_RECORD_TYPE,
      data: encodeMetadata(ownerName, creationYear),
    },
  ];

  return {
    records,
    diagnostics: [],
    repairs: [],
    estimatedBytes: ensureCapacity(records, options),
  };
}

export function isOpaqueInvalidHuntRecord(recordType: string): boolean {
  return INVALID_HUNT_RECORD_PATTERN.test(recordType);
}
