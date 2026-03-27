import "./style.css";
const HUNT_MIME = "application/vnd.tryllestav.hunt+json";

interface HuntLedgerPayload {
  year: number;
  spots: string[];
}

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
<section class="hero-panel">
  <p class="eyebrow">Tryllestavsprojekt</p>
  <h1>Magic Wand Companion</h1>
  <p class="hero-copy">
    Scan a wand to read yearly hunt progress. Hunt data is discovered by MIME + year metadata and does not depend on record order.
  </p>
</section>

<section id="nfc-panel">
  <h2>Wand Scan</h2>
  <p class="nfc-note">Web NFC works on compatible Android browsers in secure contexts (HTTPS).</p>
  <p id="nfc-compat" class="nfc-compat" hidden></p>
  <div class="nfc-controls">
    <button id="nfc-scan" type="button" class="counter">Scan Wand</button>
    <button id="nfc-stop" type="button" class="counter">Stop Scan</button>
  </div>
  <p id="nfc-status" class="nfc-status" aria-live="polite"></p>
  <p id="nfc-tag" class="nfc-tag"></p>

  <div class="hunt-grid">
    <div class="panel-block">
      <h3>Yearly Hunt Ledger</h3>
      <ul id="hunt-years" class="nfc-records"></ul>
    </div>
    <div class="panel-block">
      <h3>Record 1 Preview</h3>
      <p id="record1-preview" class="record-preview">Scan a wand to inspect record 1.</p>
    </div>
  </div>

  <h3>Raw Records</h3>
  <ul id="nfc-records" class="nfc-records"></ul>
</section>

<section id="toybox-panel">
  <h2>Toybox (Record 1)</h2>
  <p class="nfc-note">
    Configure record 1 for a normal NFC action while preserving yearly hunt ledger records.
  </p>
  <label class="nfc-label" for="toy-action">Action type</label>
  <select id="toy-action" class="nfc-input">
    <option value="url">Open URL</option>
    <option value="text">Show text</option>
  </select>
  <label class="nfc-label" for="toy-payload">Payload</label>
  <input id="toy-payload" class="nfc-input" type="text" value="https://example.org/magic" />
  <div class="nfc-controls">
    <button id="toy-write" type="button" class="counter">Write Record 1 Toy</button>
  </div>
  <p class="toybox-help">Tip: scan a wand first so hunt records can be preserved during the write.</p>
</section>
`;

const statusEl = document.querySelector<HTMLParagraphElement>("#nfc-status");
const tagEl = document.querySelector<HTMLParagraphElement>("#nfc-tag");
const recordsEl = document.querySelector<HTMLUListElement>("#nfc-records");
const huntYearsEl = document.querySelector<HTMLUListElement>("#hunt-years");
const record1PreviewEl =
  document.querySelector<HTMLParagraphElement>("#record1-preview");
const compatEl = document.querySelector<HTMLParagraphElement>("#nfc-compat");
const scanBtn = document.querySelector<HTMLButtonElement>("#nfc-scan");
const stopBtn = document.querySelector<HTMLButtonElement>("#nfc-stop");
const toyActionEl = document.querySelector<HTMLSelectElement>("#toy-action");
const toyPayloadEl = document.querySelector<HTMLInputElement>("#toy-payload");
const toyWriteBtn = document.querySelector<HTMLButtonElement>("#toy-write");

const nfcState = {
  isReading: false,
  isWriting: false,
  abortController: null as AbortController | null,
  lastReadRecords: [] as NDEFRecord[],
};

function setStatus(message: string): void {
  if (statusEl) {
    statusEl.textContent = message;
  }
}

function decodeRecordData(record: NDEFRecord): string {
  if (!record.data) {
    return "(no data)";
  }

  try {
    const encoding = record.encoding || "utf-8";
    const text = new TextDecoder(encoding).decode(record.data);
    return text.trim() || "(empty text)";
  } catch {
    return `(${record.data.byteLength} bytes)`;
  }
}

function decodeRecordUtf8(record: NDEFRecord): string {
  if (!record.data) {
    return "";
  }

  try {
    return new TextDecoder("utf-8").decode(record.data).trim();
  } catch {
    return "";
  }
}

function uniqSpotIds(spots: string[]): string[] {
  const clean = spots
    .map((spot) => spot.trim())
    .filter((spot) => spot.length > 0);
  return [...new Set(clean)].sort((a, b) => a.localeCompare(b));
}

function isValidYear(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= 2020 &&
    (value as number) <= 2100
  );
}

function parseHuntLedgerRecord(record: NDEFRecord): HuntLedgerPayload | null {
  if (record.recordType !== "mime" || record.mediaType !== HUNT_MIME) {
    return null;
  }

  const raw = decodeRecordUtf8(record);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as { year?: unknown; spots?: unknown };
    if (!isValidYear(parsed.year) || !Array.isArray(parsed.spots)) {
      return null;
    }

    const onlyStrings = parsed.spots.filter(
      (spot): spot is string => typeof spot === "string",
    );
    return {
      year: parsed.year,
      spots: uniqSpotIds(onlyStrings),
    };
  } catch {
    return null;
  }
}

function collectHuntYears(records: NDEFRecord[]): HuntLedgerPayload[] {
  const byYear = new Map<number, Set<string>>();

  for (const record of records) {
    const parsed = parseHuntLedgerRecord(record);
    if (!parsed) {
      continue;
    }

    const existing = byYear.get(parsed.year) ?? new Set<string>();
    for (const spot of parsed.spots) {
      existing.add(spot);
    }
    byYear.set(parsed.year, existing);
  }

  return [...byYear.entries()]
    .map(([year, spots]) => ({
      year,
      spots: [...spots].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.year - b.year);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderReadResult(event: NDEFReadingEvent): void {
  if (tagEl) {
    tagEl.textContent = event.serialNumber
      ? `Tag UID: ${event.serialNumber.toUpperCase()}`
      : "Tag detected";
  }

  if (!recordsEl) {
    return;
  }

  const items = event.message.records.map((record) => {
    const details: string[] = [record.recordType];
    if (record.mediaType) {
      details.push(record.mediaType);
    }
    if (record.id) {
      details.push(`id=${record.id}`);
    }
    const value = decodeRecordData(record);
    return `<li><strong>${escapeHtml(details.join(" | "))}</strong><span>${escapeHtml(value)}</span></li>`;
  });

  recordsEl.innerHTML = items.length
    ? items.join("")
    : "<li>No records found on tag.</li>";

  renderHuntYearSummary(event.message.records);
  renderRecord1Preview(event.message.records);
}

function renderHuntYearSummary(records: NDEFRecord[]): void {
  if (!huntYearsEl) {
    return;
  }

  const years = collectHuntYears(records);
  if (!years.length) {
    huntYearsEl.innerHTML =
      "<li>No hunt records found by MIME + year metadata.</li>";
    return;
  }

  const items = years.map((yearData) => {
    const spots = yearData.spots.length
      ? yearData.spots.join(", ")
      : "none yet";
    return `<li><strong>${yearData.year}</strong><span>${escapeHtml(spots)}</span></li>`;
  });

  huntYearsEl.innerHTML = items.join("");
}

function renderRecord1Preview(records: NDEFRecord[]): void {
  if (!record1PreviewEl) {
    return;
  }

  const first = records[0];
  if (!first) {
    record1PreviewEl.textContent = "No record 1 found.";
    return;
  }

  const details: string[] = [first.recordType];
  if (first.mediaType) {
    details.push(first.mediaType);
  }
  const value = decodeRecordData(first);
  record1PreviewEl.textContent = `record 1: ${details.join(" | ")} - ${value}`;
}

function buildHuntRecordWrites(records: NDEFRecord[]): NDEFRecordInit[] {
  const yearly = collectHuntYears(records);
  return yearly.map((entry) => ({
    recordType: "mime",
    mediaType: HUNT_MIME,
    data: JSON.stringify({ year: entry.year, spots: entry.spots }),
  }));
}

function buildToyRecord(action: string, payload: string): NDEFRecordInit {
  if (action === "url") {
    return {
      recordType: "url",
      data: payload,
    };
  }

  return {
    recordType: "text",
    data: payload,
  };
}

function nfcSupported(): boolean {
  return "NDEFReader" in window && window.isSecureContext;
}

function updateCompatibilityBanner(supported: boolean): void {
  if (!compatEl) {
    return;
  }

  if (supported) {
    compatEl.hidden = true;
    compatEl.textContent = "";
    return;
  }

  compatEl.hidden = false;
  compatEl.textContent =
    "Web NFC is unavailable here. Use HTTPS on Android Chrome or Samsung Internet for NFC scanning/writing.";
}

async function startScan(): Promise<void> {
  if (!nfcSupported()) {
    setStatus(
      "Web NFC is not available. Use HTTPS and a compatible Android browser.",
    );
    return;
  }
  if (nfcState.isReading) {
    setStatus("Scan already in progress.");
    return;
  }

  const ndef = new NDEFReader();
  nfcState.abortController = new AbortController();
  nfcState.abortController.signal.onabort = () => {
    nfcState.isReading = false;
    setStatus("Scan stopped.");
  };

  ndef.onreading = (event) => {
    nfcState.lastReadRecords = [...event.message.records];
    renderReadResult(event);
    setStatus("Tag read successfully.");
  };

  ndef.onreadingerror = () => {
    setStatus("Tag detected, but data could not be read.");
  };

  try {
    nfcState.isReading = true;
    await ndef.scan({ signal: nfcState.abortController.signal });
    setStatus("Scanning... bring an NFC tag close to your device.");
  } catch (error) {
    nfcState.isReading = false;
    const domError = error as DOMException;
    if (domError.name === "AbortError") {
      setStatus("Scan cancelled.");
      return;
    }
    if (domError.name === "NotAllowedError") {
      setStatus("NFC permission denied.");
      return;
    }
    if (domError.name === "NotSupportedError") {
      setStatus("Web NFC unsupported on this device/browser.");
      return;
    }
    setStatus(`Unable to start scan: ${domError.message || "Unknown error"}`);
  }
}

function stopScan(): void {
  if (nfcState.abortController && !nfcState.abortController.signal.aborted) {
    nfcState.abortController.abort();
  }
}

async function writeToyRecord1(): Promise<void> {
  if (!nfcSupported()) {
    setStatus(
      "Web NFC is not available. Use HTTPS and a compatible Android browser.",
    );
    return;
  }
  if (nfcState.isWriting) {
    return;
  }

  const action = toyActionEl?.value || "url";
  const payload = toyPayloadEl?.value.trim() || "";

  if (!payload) {
    setStatus("Enter a payload before writing.");
    return;
  }

  if (action === "url") {
    try {
      const parsed = new URL(payload);
      if (!(parsed.protocol === "https:" || parsed.protocol === "http:")) {
        setStatus("For URL action, use an http or https link.");
        return;
      }
    } catch {
      setStatus("For URL action, enter a valid URL.");
      return;
    }
  }

  if (!nfcState.lastReadRecords.length) {
    setStatus("Scan a wand first so hunt records can be preserved.");
    return;
  }

  try {
    nfcState.isWriting = true;
    setStatus("Hold the wand near your device to write record 1.");
    const ndef = new NDEFReader();
    const toyRecord = buildToyRecord(action, payload);
    const huntRecords = buildHuntRecordWrites(nfcState.lastReadRecords);

    await ndef.write({
      records: [toyRecord, ...huntRecords],
    });
    setStatus(
      "Record 1 toy written. Yearly hunt records were preserved from the scanned wand state.",
    );
  } catch (error) {
    const domError = error as DOMException;
    setStatus(`Write failed: ${domError.message || "Unknown error"}`);
  } finally {
    nfcState.isWriting = false;
  }
}

scanBtn?.addEventListener("click", () => {
  void startScan();
});

stopBtn?.addEventListener("click", () => {
  stopScan();
});

toyWriteBtn?.addEventListener("click", () => {
  void writeToyRecord1();
});

setStatus(
  nfcSupported()
    ? "Web NFC available. Tap Scan Tag to begin."
    : "Web NFC unavailable on this device/browser.",
);

updateCompatibilityBanner(nfcSupported());

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("Service worker registration failed:", error);
    });
  });
}
