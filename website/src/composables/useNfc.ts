import { ref } from "vue";

const HUNT_MIME = "application/vnd.tryllestav.hunt+json";

interface HuntLedgerEntry {
  year: number;
  spots: string[];
}

export function useNfc() {
  const isScanning = ref(false);
  const isWriting = ref(false);
  const status = ref("");
  const nfcCompatMessage = ref("");
  const record1Preview = ref("");
  const collectedSpots = ref<Record<number, string[]>>({});

  let abortController: AbortController | null = null;
  let lastReadRecords: NDEFRecord[] = [];

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

  function uniqSpotIds(spots: string[]): string[] {
    return [...new Set(spots.map((s) => s.trim()).filter(Boolean))].sort();
  }

  function parseHuntRecord(record: NDEFRecord): HuntLedgerEntry | null {
    if (record.recordType !== "mime" || record.mediaType !== HUNT_MIME) {
      return null;
    }
    const raw = decodeData(record.data);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { year?: unknown; spots?: unknown };
      if (!isValidYear(parsed.year) || !Array.isArray(parsed.spots))
        return null;
      const spots = (parsed.spots as unknown[]).filter(
        (s): s is string => typeof s === "string",
      );
      return { year: parsed.year, spots: uniqSpotIds(spots) };
    } catch {
      return null;
    }
  }

  function extractHuntYears(records: NDEFRecord[]): Record<number, string[]> {
    const byYear = new Map<number, Set<string>>();
    for (const record of records) {
      const entry = parseHuntRecord(record);
      if (!entry) continue;
      const existing = byYear.get(entry.year) ?? new Set<string>();
      for (const spot of entry.spots) existing.add(spot);
      byYear.set(entry.year, existing);
    }
    const result: Record<number, string[]> = {};
    for (const [year, spots] of byYear) {
      result[year] = [...spots].sort();
    }
    return result;
  }

  function buildHuntRecordInits(records: NDEFRecord[]): NDEFRecordInit[] {
    const extracted = extractHuntYears(records);
    return Object.entries(extracted).map(([year, spots]) => ({
      recordType: "mime",
      mediaType: HUNT_MIME,
      data: JSON.stringify({ year: Number(year), spots }),
    }));
  }

  async function startScan(): Promise<void> {
    if (!nfcSupported()) {
      nfcCompatMessage.value =
        "Web NFC is unavailable. Use HTTPS on Android Chrome or Samsung Internet.";
      return;
    }
    if (isScanning.value) return;

    let readSucceeded = false;

    try {
      const ndef = new NDEFReader();
      abortController = new AbortController();

      abortController.signal.addEventListener("abort", () => {
        isScanning.value = false;
        if (!readSucceeded) status.value = "Scan stopped.";
      });

      ndef.onreading = (event: NDEFReadingEvent) => {
        readSucceeded = true;
        lastReadRecords = [...event.message.records];
        collectedSpots.value = extractHuntYears(lastReadRecords);

        const first = lastReadRecords[0];
        record1Preview.value = first
          ? decodeData(first.data) || `(${first.recordType})`
          : "";

        status.value = "Wand read successfully!";
        isScanning.value = false;
        abortController?.abort();
      };

      ndef.onreadingerror = () => {
        status.value = "Could not read the wand. Try again.";
      };

      isScanning.value = true;
      status.value = "Bring the wand close to your device...";
      await ndef.scan({ signal: abortController.signal });
    } catch (error) {
      isScanning.value = false;
      const err = error as DOMException;
      if (err.name === "AbortError") return;
      if (err.name === "NotAllowedError") {
        status.value = "NFC permission denied.";
        return;
      }
      if (err.name === "NotSupportedError") {
        nfcCompatMessage.value = "Web NFC is not supported on this device.";
        return;
      }
      status.value = `Scan failed: ${err.message}`;
    }
  }

  function stopScan(): void {
    if (abortController && !abortController.signal.aborted) {
      abortController.abort();
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
    status.value = "Hold the wand near your device to write...";

    try {
      const ndef = new NDEFReader();
      const toyRecord: NDEFRecordInit =
        action === "url"
          ? { recordType: "url", data: payload }
          : { recordType: "text", data: payload };

      const huntRecords = buildHuntRecordInits(lastReadRecords);
      await ndef.write({ records: [toyRecord, ...huntRecords] });
      status.value = lastReadRecords.length
        ? "Record 1 written! Hunt records were preserved."
        : "Record 1 written!";
    } catch (error) {
      const err = error as DOMException;
      status.value = `Write failed: ${err.message}`;
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
    hasScannedWand: (): boolean => lastReadRecords.length > 0,
    nfcSupported,
    startScan,
    stopScan,
    writeRecord1,
  };
}
