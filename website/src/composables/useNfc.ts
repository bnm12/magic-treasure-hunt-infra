import { ref } from "vue";
import { i18n } from "../i18n";
import { resolveAppUrl } from "../utils/appUrl";
import {
  buildToyRecord,
  type ToyRecordWriteRequest,
} from "../utils/toyboxRecord1";

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

type ScanResult = "ok" | "needs-gesture" | "unsupported";

export function useNfc() {
  const isScanning = ref(false);
  const isWriting = ref(false);
  const status = ref("");
  const nfcCompatMessage = ref("");
  const record1Preview = ref("");
  const collectedSpots = ref<Record<number, number[]>>({});
  const wandMetadata = ref<WandMetadata | null>(null);

  let abortController: AbortController | null = null;
  // NOTE: lastReadRecords is intentionally module-level (closure) state.
  // useNfc() is designed to be called once in App.vue and treated as a singleton.
  // Multiple calls to useNfc() share this state, which is the desired behaviour —
  // all callers should see the same last-scanned wand records.
  let lastReadRecords: NDEFRecord[] = [];

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

  function toUint8Array(data: DataView | undefined): Uint8Array {
    if (!data) return new Uint8Array();
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }

  function cloneRecordData(data: DataView | undefined): ArrayBuffer {
    const bytes = toUint8Array(data);
    return bytes.slice().buffer;
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

  function decodeBinaryHuntPayload(
    data: DataView | undefined,
  ): number[] | null {
    const bytes = toUint8Array(data);
    if (bytes.length !== HUNT_MASK_LENGTH) return null;

    let mask = 0n;
    for (let i = 0; i < HUNT_MASK_LENGTH; i += 1) {
      mask = (mask << 8n) | BigInt(bytes[i]);
    }

    return maskToSpotIds(mask);
  }

  function nfcSupported(): boolean {
    return "NDEFReader" in window && window.isSecureContext;
  }

  /**
   * Checks preconditions before a write operation.
   * Returns true if the caller should abort, false if it may proceed.
   * Sets nfcCompatMessage if NFC is not supported.
   */
  function shouldAbortWrite(): boolean {
    if (!nfcSupported()) {
      nfcCompatMessage.value = t("nfc.unavailable");
      return true;
    }
    if (isWriting.value) return true;
    return false;
  }

  function decodeData(data: DataView | undefined): string {
    if (!data) return "";
    try {
      return new TextDecoder("utf-8").decode(data).trim();
    } catch {
      return "";
    }
  }

  function isValidYear(value: unknown): value is number {
    return (
      Number.isInteger(value) &&
      (value as number) >= 2020 &&
      (value as number) <= 2100
    );
  }

  function parseHuntRecord(record: NDEFRecord): HuntLedgerEntry | null {
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

  function parseWandMetadata(record: NDEFRecord): WandMetadata | null {
    if (record.recordType !== "mime" || record.mediaType !== "x-hunt-meta") {
      return null;
    }

    const bytes = toUint8Array(record.data);
    if (bytes.length < 3) return null;

    const creationYear = (bytes[0] << 8) | bytes[1];
    const nameLength = bytes[2];

    if (3 + nameLength !== bytes.length) return null;
    if (!isValidYear(creationYear)) return null;

    let name = "";
    for (let i = 0; i < nameLength; i += 1) {
      name += String.fromCharCode(bytes[3 + i]);
    }

    return { creationYear, name };
  }

  function extractWandMetadata(records: NDEFRecord[]): WandMetadata | null {
    for (const record of records) {
      const metadata = parseWandMetadata(record);
      if (metadata) return metadata;
    }
    return null;
  }

  function extractHuntYears(records: NDEFRecord[]): Record<number, number[]> {
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

  function buildHuntRecordInits(records: NDEFRecord[]): NDEFRecordInit[] {
    const extracted = extractHuntYears(records);
    return Object.entries(extracted).map(([year, spots]) => ({
      recordType: "mime",
      mediaType: mediaTypeForYear(Number(year)),
      data: encodeBinaryHuntPayload(spots),
    }));
  }

  function buildMetaRecordInits(records: NDEFRecord[]): NDEFRecordInit[] {
    const meta = extractWandMetadata(records);
    if (!meta) return [];

    const nameBytes = new TextEncoder().encode(meta.name);
    const payload = new ArrayBuffer(2 + 1 + nameBytes.length);
    const view = new Uint8Array(payload);
    view[0] = (meta.creationYear >> 8) & 0xff;
    view[1] = meta.creationYear & 0xff;
    view[2] = nameBytes.length;
    view.set(nameBytes, 3);

    return [{ recordType: "mime", mediaType: "x-hunt-meta", data: payload }];
  }

  function preserveRecord1(record: NDEFRecord | undefined): NDEFRecordInit | null {
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

  function stopScanning() {
    abortController?.abort();
    abortController = null;
    isScanning.value = false;
  }

  async function readTagOnce(
    prompt: string,
    timeoutMs = 15000,
  ): Promise<NDEFRecord[]> {
    if (!nfcSupported()) {
      throw new DOMException(
        "Web NFC is unavailable on this device/browser.",
        "NotSupportedError",
      );
    }

    stopScanning();
    status.value = prompt;

    return await new Promise<NDEFRecord[]>((resolve, reject) => {
      const scanController = new AbortController();
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        scanController.abort();
      };

      const timeout = setTimeout(() => {
        finish();
        reject(new DOMException("Timed out waiting for tag.", "TimeoutError"));
      }, timeoutMs);

      void (async () => {
        try {
          const ndef = new NDEFReader();

          ndef.onreading = (event: NDEFReadingEvent) => {
            const records = [...event.message.records];
            finish();
            resolve(records);
          };

          ndef.onreadingerror = () => {
            finish();
            reject(new DOMException("Could not read the tag.", "ReadError"));
          };

          await ndef.scan({ signal: scanController.signal });
        } catch (error) {
          finish();
          reject(error);
        }
      })();
    });
  }

  async function keepReaderActive(): Promise<void> {
    if (isScanning.value) return;
    await beginScanning();
  }

  async function beginScanning(): Promise<ScanResult> {
    if (!nfcSupported()) {
      nfcCompatMessage.value = t("nfc.unavailable");
      return "unsupported";
    }
    if (isScanning.value) return "ok";

    try {
      const ndef = new NDEFReader();
      abortController = new AbortController();

      abortController.signal.addEventListener("abort", () => {
        isScanning.value = false;
      });

      ndef.onreading = (event: NDEFReadingEvent) => {
        lastReadRecords = [...event.message.records];
        collectedSpots.value = extractHuntYears(lastReadRecords);
        wandMetadata.value = extractWandMetadata(lastReadRecords);

        const first = lastReadRecords[0];
        record1Preview.value = first
          ? decodeData(first.data) || `(${first.recordType})`
          : "";

        status.value = t("nfc.detected");
      };

      ndef.onreadingerror = () => {
        status.value = t("nfc.read_failed");
      };

      isScanning.value = true;
      await ndef.scan({ signal: abortController.signal });
      return "ok";
    } catch (error) {
      isScanning.value = false;
      const err = error as DOMException;
      if (err.name === "AbortError") return "ok";
      if (err.name === "NotAllowedError") return "needs-gesture";
      if (err.name === "NotSupportedError") {
        nfcCompatMessage.value = t("nfc.not_supported");
        return "unsupported";
      }
      status.value = t("nfc.scan_failed", { error: err.message });
      return "unsupported";
    }
  }

  async function writeRecord1(request: ToyRecordWriteRequest): Promise<void> {
    if (shouldAbortWrite()) return;

    isWriting.value = true;
    status.value = t("nfc.write_verify");

    try {
      const currentRecords = await readTagOnce(
        t("nfc.write_verify_reading"),
      );
      const ndef = new NDEFReader();
      const toyRecord = buildToyRecord(request);

      const huntRecords = buildHuntRecordInits(currentRecords);
      const metaRecords = buildMetaRecordInits(currentRecords);
      await ndef.write({
        records: [toyRecord, ...metaRecords, ...huntRecords],
      });

      lastReadRecords = currentRecords;
      collectedSpots.value = extractHuntYears(currentRecords);
      wandMetadata.value = extractWandMetadata(currentRecords);
      status.value = t("nfc.write_record1_success");
      await keepReaderActive();
    } catch (error) {
      const err = error as DOMException;
      status.value = t("nfc.write_record1_failed", { error: err.message });
    } finally {
      isWriting.value = false;
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

    isWriting.value = true;
    status.value = t("nfc.init_prompt");

    try {
      const ndef = new NDEFReader();

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

      await ndef.write({ records });
      status.value = t("nfc.init_success", { name: ownerName, year: creationYear });
      wandMetadata.value = { creationYear, name: ownerName };
      await keepReaderActive();
    } catch (error) {
      const err = error as DOMException;
      status.value = t("nfc.init_failed", { error: err.message });
    } finally {
      isWriting.value = false;
    }
  }

  async function unlockTestSpot(year: number, spotId: number): Promise<void> {
    if (shouldAbortWrite()) return;
    if (!isValidYear(year) || !Number.isInteger(spotId) || spotId < 1 || spotId > 64) {
      status.value = t("nfc.unlock_invalid");
      return;
    }

    isWriting.value = true;
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

      const ndef = new NDEFReader();
      await ndef.write({ records });

      lastReadRecords = currentRecords;
      collectedSpots.value = updatedByYear;
      wandMetadata.value = extractWandMetadata(currentRecords);
      status.value = t("nfc.unlock_success", { spot: spotId, year });
      await keepReaderActive();
    } catch (error) {
      const err = error as DOMException;
      status.value = t("nfc.unlock_failed", { error: err.message });
    } finally {
      isWriting.value = false;
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
