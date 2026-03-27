<template>
  <div id="app" class="app">
    <section class="hero-panel">
      <p class="eyebrow">Tryllestavsprojekt</p>
      <h1>Magic Wand Companion</h1>
      <p class="hero-copy">
        Scan a wand to read yearly hunt progress. Hunt data is discovered by
        MIME + year metadata and does not depend on record order.
      </p>
    </section>

    <section id="nfc-panel" class="nfc-panel">
      <h2>Wand Scan</h2>
      <p class="nfc-note">
        Web NFC works on compatible Android browsers in secure contexts (HTTPS).
      </p>

      <div v-if="nfcCompatMessage" class="nfc-compat">
        {{ nfcCompatMessage }}
      </div>

      <div class="nfc-controls">
        <button
          :disabled="isScanning"
          @click="startScan"
          type="button"
          class="counter"
        >
          {{ isScanning ? "Scanning..." : "Scan Wand" }}
        </button>
        <button
          :disabled="!isScanning"
          @click="stopScan"
          type="button"
          class="counter"
        >
          Stop Scan
        </button>
      </div>

      <p v-if="status" class="nfc-status" aria-live="polite">
        {{ status }}
      </p>

      <div v-if="huntYears.length > 0" class="hunt-grid">
        <div class="panel-block">
          <h3>Yearly Hunt Ledger</h3>
          <ul class="nfc-records">
            <li v-for="year in huntYears" :key="year">
              Year {{ year }}: {{ collectedSpots[year]?.length || 0 }} spots
              collected
            </li>
          </ul>
        </div>
        <div class="panel-block">
          <h3>Record 1 Preview</h3>
          <p class="record-preview">
            {{ record1Preview || "Scan a wand to inspect record 1." }}
          </p>
        </div>
      </div>
    </section>

    <section v-if="records.length > 0" id="raw-records">
      <h3>Raw Records</h3>
      <ul class="nfc-records">
        <li v-for="(record, index) in records" :key="index">
          {{ record }}
        </li>
      </ul>
    </section>

    <section id="toybox-panel" class="toybox-panel">
      <h2>Toybox (Record 1)</h2>
      <p class="nfc-note">
        Configure record 1 for a normal NFC action while preserving yearly hunt
        ledger records.
      </p>
      <label class="nfc-label" for="toy-action">Action type</label>
      <select v-model="toyAction" id="toy-action" class="nfc-input">
        <option value="url">Open URL</option>
        <option value="text">Show text</option>
      </select>
      <label class="nfc-label" for="toy-payload">Payload</label>
      <input
        v-model="toyPayload"
        id="toy-payload"
        class="nfc-input"
        type="text"
        placeholder="https://example.org/magic"
      />
      <div class="nfc-controls">
        <button
          :disabled="isWriting"
          @click="writeToy"
          type="button"
          class="counter"
        >
          {{ isWriting ? "Writing..." : "Write Record 1 Toy" }}
        </button>
      </div>
      <p class="toybox-help">
        Tip: scan a wand first so hunt records can be preserved during the
        write.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

const isScanning = ref(false);
const isWriting = ref(false);
const status = ref("");
const nfcCompatMessage = ref("");
const record1Preview = ref("");
const huntYears = ref<number[]>([]);
const records = ref<string[]>([]);
const collectedSpots = ref<Record<number, string[]>>({});

const toyAction = ref("url");
const toyPayload = ref("https://example.org/magic");

const HUNT_MIME = "application/vnd.tryllestav.hunt+json";

async function startScan() {
  if (!("NDEFReader" in window)) {
    nfcCompatMessage.value =
      "Web NFC is not supported on this device or browser.";
    return;
  }

  isScanning.value = true;
  status.value = "Waiting for wand...";

  try {
    const ndef = new (window as any).NDEFReader();
    await ndef.scan();

    ndef.onreading = (event: any) => {
      const { records: ndRecords } = event;
      records.value = [];
      huntYears.value = [];
      collectedSpots.value = {};

      ndRecords.forEach((record: NDEFRecord, index: number) => {
        const recordInfo = parseNDEFRecord(record, index);
        records.value.push(recordInfo);

        if (record.mediaType === HUNT_MIME) {
          const payload = new TextDecoder().decode(record.data);
          const hunt = JSON.parse(payload);
          huntYears.value.push(hunt.year);
          collectedSpots.value[hunt.year] = hunt.spots || [];
        }

        if (index === 0) {
          const preview = new TextDecoder("utf-8").decode(
            record.data || new Uint8Array(),
          );
          record1Preview.value = preview || "(empty)";
        }
      });

      status.value = "Wand read successfully!";
      isScanning.value = false;
    };

    ndef.onreadingerror = () => {
      status.value = "Unable to read wand. Try again.";
    };
  } catch (error: any) {
    nfcCompatMessage.value = `NFC error: ${error.message}`;
    isScanning.value = false;
  }
}

function stopScan() {
  isScanning.value = false;
  status.value = "";
}

async function writeToy() {
  if (!("NDEFReader" in window)) {
    nfcCompatMessage.value =
      "Web NFC is not supported on this device or browser.";
    return;
  }

  isWriting.value = true;
  status.value = "Touch wand to write...";

  try {
    const ndef = new (window as any).NDEFReader();
    const records: NDEFRecord[] = [
      new (window as any).NDEFRecord({
        recordType: toyAction.value === "url" ? "url" : "text",
        data: toyPayload.value,
      }),
    ];

    await ndef.write({ records });
    status.value = "Record 1 written successfully!";
  } catch (error: any) {
    status.value = `Write error: ${error.message}`;
  } finally {
    isWriting.value = false;
  }
}

function parseNDEFRecord(record: NDEFRecord, index: number): string {
  let info = `Record ${index + 1}: `;
  info += `Type=${record.recordType}, `;

  if (record.mediaType) {
    info += `MediaType=${record.mediaType}, `;
  }

  if (record.data) {
    try {
      const text = new TextDecoder("utf-8").decode(record.data);
      info += `Data=${text.substring(0, 50)}`;
    } catch {
      info += `Data=(${record.data.byteLength} bytes)`;
    }
  }

  return info;
}
</script>

<style scoped>
/* Styles are imported globally in main.ts */
</style>
