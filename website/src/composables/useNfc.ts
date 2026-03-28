import { ref } from "vue";

const HUNT_MIME_PREFIX = "x-hunt:";
const HUNT_MASK_LENGTH = 8;

interface HuntLedgerEntry {
  year: number;
  spots: number[];
}

export function useNfc() {
  const isScanning = ref(false);
  const isWriting = ref(false);
  const status = ref("");
  const nfcCompatMessage = ref("");
  const record1Preview = ref("");
  const collectedSpots = ref<Record<number, number[]>>({});
  const wandMetadata = ref<{ creationYear: number; name: string } | null>(null);

  let abortController: AbortController | null = null;
  let lastReadRecords: NDEFRecord[] = [];

  // Spot ID N corresponds to bit (N-1), so spot 1 = bit 0, spot 2 = bit 1, etc.
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
    for (let i = 0; i < 64; i++) {
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

  // Compact payload: [64-bit mask]
  function encodeBinaryHuntPayload(spots: number[]): ArrayBuffer {
    const buffer = new ArrayBuffer(HUNT_MASK_LENGTH);
    const payload = new Uint8Array(buffer);

    const mask = spotIdsToMask(spots);
    for (let i = 0; i < 8; i++) {
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
    for (let i = 0; i < 8; i++) {
      mask = (mask << 8n) | BigInt(bytes[i]);
    }

    return maskToSpotIds(mask);
  }

  function nfcSupported(): boolean {
    return "NDEFReader" in window && window.isSecureContext;
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

  interface WandMetadata {
    creationYear: number;
    name: string;
  }

  function parseWandMetadata(record: NDEFRecord): WandMetadata | null {
    if (record.recordType !== "mime" || record.mediaType !== "x-hunt-meta") {
      return null;
    }

    const bytes = toUint8Array(record.data);
    if (bytes.length < 3) return null;

    // Payload format: 2 bytes year (big-endian) + 1 byte name length + name string
    const creationYear = (bytes[0] << 8) | bytes[1];
    const nameLength = bytes[2];

    if (3 + nameLength !== bytes.length) return null; // Strict length check
    if (!isValidYear(creationYear)) return null;

    let name = "";
    for (let i = 0; i < nameLength; i++) {
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
      const timeout = setTimeout(() => {
        scanController.abort();
        reject(new DOMException("Timed out waiting for tag.", "TimeoutError"));
      }, timeoutMs);

      const finish = () => {
        clearTimeout(timeout);
        scanController.abort();
      };

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
          clearTimeout(timeout);
          reject(error);
        }
      })();
    });
  }

  async function keepReaderActive(): Promise<void> {
    // Reclaim an active scan session after writes so the browser keeps NFC handling.
    if (isScanning.value) return;
    await beginScanning();
  }

  /**
   * Start always-on background scanning. This is intended to be called once
   * on app mount. The scan stays active until the page is closed. On phones
   * this means any time a wand is tapped, the app reads it automatically.
   */
  type ScanResult = "ok" | "needs-gesture" | "unsupported";

  async function beginScanning(): Promise<ScanResult> {
    if (!nfcSupported()) {
      nfcCompatMessage.value =
        "Web NFC is unavailable. Use HTTPS on Android Chrome or Samsung Internet.";
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

        status.value = "Wand detected!";
      };

      ndef.onreadingerror = () => {
        status.value = "Could not read the wand. Try again.";
      };

      isScanning.value = true;
      await ndef.scan({ signal: abortController.signal });
      return "ok";
    } catch (error) {
      isScanning.value = false;
      const err = error as DOMException;
      if (err.name === "AbortError") return "ok";
      if (err.name === "NotAllowedError") {
        return "needs-gesture";
      }
      if (err.name === "NotSupportedError") {
        nfcCompatMessage.value = "Web NFC is not supported on this device.";
        return "unsupported";
      }
      status.value = `Scan failed: ${err.message}`;
      return "unsupported";
    }
  }

  async function writeRecord1(action: string, payload: string): Promise<void> {
    if (!nfcSupported()) {
      nfcCompatMessage.value =
        "Web NFC is unavailable. Use HTTPS on Android Chrome or Samsung Internet.";
      return;
    }
    if (isWriting.value) return;

    isWriting.value = true;
    status.value = "Hold the wand near your device to verify and write...";

    try {
      const currentRecords = await readTagOnce(
        "Hold the wand near your device to verify its current records...",
      );
      const ndef = new NDEFReader();
      const toyRecord: NDEFRecordInit =
        action === "url"
          ? { recordType: "url", data: payload }
          : { recordType: "text", data: payload };

      const huntRecords = buildHuntRecordInits(currentRecords);
      const metaRecords = buildMetaRecordInits(currentRecords);
      await ndef.write({
        records: [toyRecord, ...metaRecords, ...huntRecords],
      });

      lastReadRecords = currentRecords;
      collectedSpots.value = extractHuntYears(currentRecords);
      wandMetadata.value = extractWandMetadata(currentRecords);
      status.value =
        "Record 1 written! The tag was read first and treasure progress was preserved.";
      await keepReaderActive();
    } catch (error) {
      const err = error as DOMException;
      status.value = `Write failed: ${err.message}`;
    } finally {
      isWriting.value = false;
    }
  }

  async function initializeWand(
    ownerName: string,
    creationYear: number,
  ): Promise<void> {
    if (!nfcSupported()) {
      nfcCompatMessage.value =
        "Web NFC is unavailable. Use HTTPS on Android Chrome or Samsung Internet.";
      return;
    }
    if (isWriting.value) return;
    if (!ownerName || ownerName.length === 0 || ownerName.length > 127) {
      status.value = "Owner name must be 1-127 characters.";
      return;
    }

    isWriting.value = true;
    status.value = "Bring blank tag to initialize as wand...";

    try {
      const ndef = new NDEFReader();

      // Encode metadata payload: year (2 bytes big-endian) + name length + name string
      const nameBytes = new TextEncoder().encode(ownerName);
      const metaPayload = new ArrayBuffer(2 + 1 + nameBytes.length);
      const metaView = new Uint8Array(metaPayload);

      // Year (big-endian)
      metaView[0] = (creationYear >> 8) & 0xff;
      metaView[1] = creationYear & 0xff;
      // Name length
      metaView[2] = nameBytes.length;
      // Name string
      metaView.set(nameBytes, 3);

      const records: NDEFRecordInit[] = [
        { recordType: "url", data: "https://192.168.1.131:5173" },
        { recordType: "mime", mediaType: "x-hunt-meta", data: metaPayload },
      ];

      await ndef.write({ records });
      status.value = `SUCCESS: Wand initialized for ${ownerName} (year ${creationYear})!`;
      wandMetadata.value = { creationYear, name: ownerName };
      await keepReaderActive();
    } catch (error) {
      const err = error as DOMException;
      status.value = `Initialization failed: ${err.message}`;
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
    hasScannedWand: (): boolean => lastReadRecords.length > 0,
    nfcSupported,
    beginScanning,
    writeRecord1,
    initializeWand,
  };
}

