import { computed, inject, ref } from "vue";
import type { ComputedRef, InjectionKey, Ref } from "vue";
import { i18n } from "../i18n";
import { resolveAppUrl } from "../utils/appUrl";
import {
  buildToyRecord,
  type ToyRecordWriteRequest,
} from "../utils/toyboxRecord1";
import {
  createNfcSession,
  NfcSessionError,
  type NfcFailureReason,
  type NfcRecord,
  type NfcSession,
} from "./nfcSession";

const { t } = i18n.global;
const HUNT_MIME_PREFIX = "x-hunt:";
const HUNT_MASK_LENGTH = 8;

interface HuntLedgerEntry {
  year: number;
  spots: number[];
}

interface WandMetadata {
  creationYear: number;
  name: string;
}

export type ScanResult =
  | "ok"
  | "needs-gesture"
  | "unsupported"
  | "busy";

export interface NfcStore {
  isScanning: ComputedRef<boolean>;
  isWriting: ComputedRef<boolean>;
  status: Ref<string>;
  nfcCompatMessage: Ref<string>;
  record1Preview: Ref<string>;
  collectedSpots: Ref<Record<number, number[]>>;
  wandMetadata: Ref<WandMetadata | null>;
  nfcSupported(): boolean;
  beginScanning(): Promise<ScanResult>;
  writeRecord1(request: ToyRecordWriteRequest): Promise<void>;
  initializeWand(ownerName: string, creationYear: number): Promise<void>;
  unlockTestSpot(year: number, spotId: number): Promise<void>;
}

export const NFC_STORE_KEY: InjectionKey<NfcStore> = Symbol("nfc-store");

function toUint8Array(data: ArrayBuffer | undefined): Uint8Array {
  return data ? new Uint8Array(data) : new Uint8Array();
}

function cloneRecordData(data: ArrayBuffer | undefined): ArrayBuffer {
  return data ? data.slice(0) : new ArrayBuffer(0);
}

function mediaTypeForYear(year: number): string {
  return `${HUNT_MIME_PREFIX}${year}`;
}

function yearFromMediaType(mediaType: string | undefined): number | null {
  if (!mediaType || !mediaType.startsWith(HUNT_MIME_PREFIX)) {
    return null;
  }

  const year = Number.parseInt(mediaType.slice(HUNT_MIME_PREFIX.length), 10);
  return isValidYear(year) ? year : null;
}

function spotIdsToMask(spotIds: number[]): bigint {
  let mask = 0n;
  for (const id of spotIds) {
    if (id >= 1 && id <= 64) {
      mask |= 1n << BigInt(id - 1);
    }
  }
  return mask;
}

function maskToSpotIds(mask: bigint): number[] {
  const spots: number[] = [];
  for (let i = 0; i < 64; i += 1) {
    if ((mask & (1n << BigInt(i))) !== 0n) {
      spots.push(i + 1);
    }
  }
  return spots.sort((a, b) => a - b);
}

function encodeBinaryHuntPayload(spots: number[]): ArrayBuffer {
  const buffer = new ArrayBuffer(HUNT_MASK_LENGTH);
  const payload = new Uint8Array(buffer);

  const mask = spotIdsToMask(spots);
  for (let i = 0; i < HUNT_MASK_LENGTH; i += 1) {
    const shift = BigInt((7 - i) * 8);
    payload[i] = Number((mask >> shift) & 0xffn);
  }

  return buffer;
}

function decodeBinaryHuntPayload(data: ArrayBuffer | undefined): number[] | null {
  const bytes = toUint8Array(data);
  if (bytes.length !== HUNT_MASK_LENGTH) return null;

  let mask = 0n;
  for (let i = 0; i < HUNT_MASK_LENGTH; i += 1) {
    mask = (mask << 8n) | BigInt(bytes[i]);
  }

  return maskToSpotIds(mask);
}

function isValidYear(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= 2020 &&
    (value as number) <= 2100
  );
}

function decodeData(data: ArrayBuffer | undefined): string {
  if (!data) return "";
  try {
    return new TextDecoder("utf-8").decode(data).trim();
  } catch {
    return "";
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createNfcStore(session: NfcSession = createNfcSession()): NfcStore {
  const isScanning = computed(() => session.state.value === "scanning");
  const isWriting = computed(() => session.state.value === "writing");
  const status = ref("");
  const nfcCompatMessage = ref("");
  const record1Preview = ref("");
  const collectedSpots = ref<Record<number, number[]>>({});
  const wandMetadata = ref<WandMetadata | null>(null);

  function parseHuntRecord(record: NfcRecord): HuntLedgerEntry | null {
    if (record.recordType !== "mime") {
      return null;
    }

    const year = yearFromMediaType(record.mediaType);
    if (!year) {
      return null;
    }

    const spots = decodeBinaryHuntPayload(record.data);
    if (!spots) {
      return null;
    }

    return { year, spots };
  }

  function parseWandMetadata(record: NfcRecord): WandMetadata | null {
    if (record.recordType !== "mime" || record.mediaType !== "x-hunt-meta") {
      return null;
    }

    const bytes = toUint8Array(record.data);
    if (bytes.length < 3) return null;

    const creationYear = (bytes[0] << 8) | bytes[1];
    const nameLength = bytes[2];

    if (3 + nameLength !== bytes.length) return null;
    if (!isValidYear(creationYear)) return null;

    const name = new TextDecoder("utf-8").decode(bytes.slice(3));
    return { creationYear, name };
  }

  function extractWandMetadata(records: NfcRecord[]): WandMetadata | null {
    for (const record of records) {
      const metadata = parseWandMetadata(record);
      if (metadata) return metadata;
    }
    return null;
  }

  function extractHuntYears(records: NfcRecord[]): Record<number, number[]> {
    const byYear = new Map<number, Set<number>>();

    for (const record of records) {
      const entry = parseHuntRecord(record);
      if (!entry) continue;

      const existing = byYear.get(entry.year) ?? new Set<number>();
      for (const spot of entry.spots) existing.add(spot);
      byYear.set(entry.year, existing);
    }

    const result: Record<number, number[]> = {};
    for (const [year, spots] of byYear) {
      result[year] = [...spots].sort((a, b) => a - b);
    }
    return result;
  }

  function updateReadState(records: NfcRecord[]) {
    collectedSpots.value = extractHuntYears(records);
    wandMetadata.value = extractWandMetadata(records);

    const first = records[0];
    record1Preview.value = first
      ? decodeData(first.data) || `(${first.recordType})`
      : "";
    nfcCompatMessage.value = "";
    status.value = t("nfc.detected");
  }

  function applyFailure(reason: NfcFailureReason, error?: Error) {
    switch (reason) {
      case "unsupported":
        nfcCompatMessage.value = t("nfc.not_supported");
        break;
      case "permission-denied":
        nfcCompatMessage.value = t("nfc.permission_denied");
        break;
      case "read-failed":
      case "timeout":
        status.value = t("nfc.read_failed");
        break;
      case "busy":
        status.value = t("nfc.busy");
        break;
      case "cancelled":
        break;
      default:
        status.value = t("nfc.scan_failed", {
          error: error?.message ?? "Unknown NFC error",
        });
    }
  }

  function nfcSupported(): boolean {
    return session.isSupported();
  }

  async function beginScanning(): Promise<ScanResult> {
    const result = await session.startScan({
      onReading: updateReadState,
      onError: applyFailure,
    });

    if (!result.ok) {
      applyFailure(result.reason, result.error);
      if (result.reason === "permission-denied") return "needs-gesture";
      if (result.reason === "busy") return "busy";
      if (result.reason === "unsupported") return "unsupported";
    }

    return "ok";
  }

  async function readTagOnce(prompt: string): Promise<NfcRecord[]> {
    status.value = prompt;
    const result = await session.readOnce();
    if (!result.ok) {
      applyFailure(result.reason, result.error);
      throw new NfcSessionError(result.reason, result.error?.message);
    }
    return result.value;
  }

  async function writeRecords(records: NDEFRecordInit[]): Promise<void> {
    const result = await session.write({ records });
    if (!result.ok) {
      applyFailure(result.reason, result.error);
      throw new NfcSessionError(result.reason, result.error?.message);
    }
  }

  function shouldAbortWrite(): boolean {
    if (!nfcSupported()) {
      nfcCompatMessage.value = t("nfc.unavailable");
      return true;
    }
    if (isWriting.value) return true;

    session.cancel();
    return false;
  }

  function buildHuntRecordInits(records: NfcRecord[]): NDEFRecordInit[] {
    const extracted = extractHuntYears(records);
    return Object.entries(extracted).map(([year, spots]) => ({
      recordType: "mime",
      mediaType: mediaTypeForYear(Number(year)),
      data: encodeBinaryHuntPayload(spots),
    }));
  }

  function buildMetaRecordInits(records: NfcRecord[]): NDEFRecordInit[] {
    for (const record of records) {
      if (record.recordType === "mime" && record.mediaType === "x-hunt-meta") {
        return [
          {
            recordType: "mime",
            mediaType: "x-hunt-meta",
            data: cloneRecordData(record.data),
          },
        ];
      }
    }
    return [];
  }

  function preserveRecord1(record: NfcRecord | undefined): NDEFRecordInit | null {
    if (!record) return null;

    if (record.recordType === "url") {
      return { recordType: "url", data: decodeData(record.data) };
    }

    if (record.recordType === "text") {
      return { recordType: "text", data: decodeData(record.data) };
    }

    if (record.recordType === "mime" && record.mediaType) {
      return {
        recordType: "mime",
        mediaType: record.mediaType,
        data: cloneRecordData(record.data),
      };
    }

    return null;
  }

  async function keepReaderActive(): Promise<void> {
    const result = await beginScanning();
    if (result === "needs-gesture") {
      nfcCompatMessage.value = t("nfc.permission_denied");
    }
  }

  async function writeRecord1(request: ToyRecordWriteRequest): Promise<void> {
    if (shouldAbortWrite()) return;

    status.value = t("nfc.write_verify");

    try {
      const currentRecords = await readTagOnce(
        t("nfc.write_verify_reading"),
      );
      const toyRecord = buildToyRecord(request);
      const huntRecords = buildHuntRecordInits(currentRecords);
      const metaRecords = buildMetaRecordInits(currentRecords);

      await writeRecords([toyRecord, ...metaRecords, ...huntRecords]);
      updateReadState(currentRecords);
      status.value = t("nfc.write_record1_success");
      void keepReaderActive();
    } catch (error) {
      status.value = t("nfc.write_record1_failed", {
        error: errorMessage(error),
      });
    }
  }

  async function initializeWand(
    ownerName: string,
    creationYear: number,
  ): Promise<void> {
    if (shouldAbortWrite()) return;
    if (!ownerName || ownerName.length === 0 || ownerName.length > 127) {
      status.value = t("nfc.init_name_invalid");
      return;
    }

    status.value = t("nfc.init_prompt");

    try {
      const nameBytes = new TextEncoder().encode(ownerName);
      const metaPayload = new ArrayBuffer(2 + 1 + nameBytes.length);
      const metaView = new Uint8Array(metaPayload);
      metaView[0] = (creationYear >> 8) & 0xff;
      metaView[1] = creationYear & 0xff;
      metaView[2] = nameBytes.length;
      metaView.set(nameBytes, 3);

      const records: NDEFRecordInit[] = [
        { recordType: "url", data: resolveAppUrl("") },
        { recordType: "mime", mediaType: "x-hunt-meta", data: metaPayload },
      ];

      await writeRecords(records);
      status.value = t("nfc.init_success", {
        name: ownerName,
        year: creationYear,
      });
      wandMetadata.value = { creationYear, name: ownerName };
      void keepReaderActive();
    } catch (error) {
      status.value = t("nfc.init_failed", { error: errorMessage(error) });
      throw error;
    }
  }

  async function unlockTestSpot(year: number, spotId: number): Promise<void> {
    if (shouldAbortWrite()) return;
    if (
      !isValidYear(year) ||
      !Number.isInteger(spotId) ||
      spotId < 1 ||
      spotId > 64
    ) {
      status.value = t("nfc.unlock_invalid");
      return;
    }

    status.value = t("nfc.unlock_prompt", { spot: spotId, year });

    try {
      const currentRecords = await readTagOnce(
        t("nfc.write_verify_reading"),
      );

      const record1 = preserveRecord1(currentRecords[0]);
      const updatedByYear = extractHuntYears(currentRecords);
      const existing = new Set(updatedByYear[year] ?? []);
      existing.add(spotId);
      updatedByYear[year] = [...existing].sort((a, b) => a - b);

      const huntRecords = Object.entries(updatedByYear).map(
        ([entryYear, spots]) => ({
          recordType: "mime" as const,
          mediaType: mediaTypeForYear(Number(entryYear)),
          data: encodeBinaryHuntPayload(spots),
        }),
      );
      const metaRecords = buildMetaRecordInits(currentRecords);
      const records: NDEFRecordInit[] = [
        ...(record1 ? [record1] : []),
        ...metaRecords,
        ...huntRecords,
      ];

      await writeRecords(records);
      collectedSpots.value = updatedByYear;
      wandMetadata.value = extractWandMetadata(currentRecords);
      status.value = t("nfc.unlock_success", { spot: spotId, year });
      void keepReaderActive();
    } catch (error) {
      status.value = t("nfc.unlock_failed", { error: errorMessage(error) });
    }
  }

  return {
    isScanning,
    isWriting,
    status,
    nfcCompatMessage,
    record1Preview,
    collectedSpots,
    wandMetadata,
    nfcSupported,
    beginScanning,
    writeRecord1,
    initializeWand,
    unlockTestSpot,
  };
}

export function useNfc(): NfcStore {
  const store = inject(NFC_STORE_KEY);
  if (!store) {
    throw new Error("NFC store is not provided by the application entry point.");
  }
  return store;
}
