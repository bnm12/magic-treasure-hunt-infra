import "./style.css";
import typescriptLogo from "./assets/typescript.svg";
import viteLogo from "./assets/vite.svg";
import heroImg from "./assets/hero.png";
import { setupCounter } from "./counter.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
<section id="center">
  <div class="hero">
    <img src="${heroImg}" class="base" width="170" height="179">
    <img src="${typescriptLogo}" class="framework" alt="TypeScript logo"/>
    <img src=${viteLogo} class="vite" alt="Vite logo" />
  </div>
  <div>
    <h1>Get started</h1>
    <p>Edit <code>src/main.ts</code> and save to test <code>HMR</code></p>
  </div>
  <button id="counter" type="button" class="counter"></button>
</section>

<div class="ticks"></div>

<section id="next-steps">
  <div id="docs">
    <svg class="icon" role="presentation" aria-hidden="true"><use href="/icons.svg#documentation-icon"></use></svg>
    <h2>Documentation</h2>
    <p>Your questions, answered</p>
    <ul>
      <li>
        <a href="https://vite.dev/" target="_blank">
          <img class="logo" src=${viteLogo} alt="" />
          Explore Vite
        </a>
      </li>
      <li>
        <a href="https://www.typescriptlang.org" target="_blank">
          <img class="button-icon" src="${typescriptLogo}" alt="">
          Learn more
        </a>
      </li>
    </ul>
  </div>
  <div id="social">
    <svg class="icon" role="presentation" aria-hidden="true"><use href="/icons.svg#social-icon"></use></svg>
    <h2>Connect with us</h2>
    <p>Join the Vite community</p>
    <ul>
      <li><a href="https://github.com/vitejs/vite" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#github-icon"></use></svg>GitHub</a></li>
      <li><a href="https://chat.vite.dev/" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#discord-icon"></use></svg>Discord</a></li>
      <li><a href="https://x.com/vite_js" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#x-icon"></use></svg>X.com</a></li>
      <li><a href="https://bsky.app/profile/vite.dev" target="_blank"><svg class="button-icon" role="presentation" aria-hidden="true"><use href="/icons.svg#bluesky-icon"></use></svg>Bluesky</a></li>
    </ul>
  </div>
</section>

<div class="ticks"></div>
<section id="spacer"></section>

<section id="nfc-panel">
  <h2>Web NFC Demo</h2>
  <p class="nfc-note">Works on compatible Android browsers in secure contexts (HTTPS).</p>
  <p id="nfc-compat" class="nfc-compat" hidden></p>
  <div class="nfc-controls">
    <button id="nfc-scan" type="button" class="counter">Scan Tag</button>
    <button id="nfc-stop" type="button" class="counter">Stop Scan</button>
    <button id="nfc-write" type="button" class="counter">Write Text</button>
  </div>
  <label class="nfc-label" for="nfc-payload">Payload to write</label>
  <textarea id="nfc-payload" class="nfc-payload" rows="3">Hello from Tryllestavsprojekt</textarea>
  <p id="nfc-status" class="nfc-status" aria-live="polite"></p>
  <p id="nfc-tag" class="nfc-tag"></p>
  <ul id="nfc-records" class="nfc-records"></ul>
</section>
`;

setupCounter(document.querySelector<HTMLButtonElement>("#counter")!);

const statusEl = document.querySelector<HTMLParagraphElement>("#nfc-status");
const tagEl = document.querySelector<HTMLParagraphElement>("#nfc-tag");
const recordsEl = document.querySelector<HTMLUListElement>("#nfc-records");
const compatEl = document.querySelector<HTMLParagraphElement>("#nfc-compat");
const payloadEl = document.querySelector<HTMLTextAreaElement>("#nfc-payload");
const scanBtn = document.querySelector<HTMLButtonElement>("#nfc-scan");
const stopBtn = document.querySelector<HTMLButtonElement>("#nfc-stop");
const writeBtn = document.querySelector<HTMLButtonElement>("#nfc-write");

const nfcState = {
  isReading: false,
  isWriting: false,
  abortController: null as AbortController | null,
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

async function writeText(): Promise<void> {
  if (!nfcSupported()) {
    setStatus(
      "Web NFC is not available. Use HTTPS and a compatible Android browser.",
    );
    return;
  }
  if (nfcState.isWriting) {
    return;
  }

  const text = payloadEl?.value.trim() || "";
  if (!text) {
    setStatus("Enter a payload before writing.");
    return;
  }

  try {
    nfcState.isWriting = true;
    setStatus("Hold an NFC tag near your device to write.");
    const ndef = new NDEFReader();
    await ndef.write({
      records: [{ recordType: "text", data: text }],
    });
    setStatus("Write successful.");
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

writeBtn?.addEventListener("click", () => {
  void writeText();
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
