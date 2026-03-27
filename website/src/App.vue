<template>
  <div id="app">
    <header class="hero-panel">
      <p class="eyebrow">Tryllestavsprojekt</p>
      <h1>Magic Wand Companion</h1>
      <p class="hero-copy">
        Tap your wand at a magic spot to collect it. Scan your wand here to see
        your progress and hints.
      </p>
    </header>

    <section class="scan-section">
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

      <p v-if="status" class="nfc-status" aria-live="polite">{{ status }}</p>
    </section>

    <template v-if="availableYears.length > 0">
      <YearSelector
        v-if="availableYears.length > 1"
        v-model="selectedYear"
        :years="availableYears"
        :progress="yearProgress"
      />
      <HuntView
        v-if="selectedHunt"
        :hunt="selectedHunt"
        :collected-ids="selectedCollectedIds"
      />
    </template>

    <ToyboxPanel
      :has-scanned-wand="hasScannedWand()"
      :is-writing="isWriting"
      @write="({ action, payload }) => writeRecord1(action, payload)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useNfc } from "./composables/useNfc";
import { loadHunts } from "./utils/spotLoader";
import type { HuntYear } from "./utils/spotLoader";
import HuntView from "./components/HuntView.vue";
import YearSelector from "./components/YearSelector.vue";
import ToyboxPanel from "./components/ToyboxPanel.vue";

const {
  isScanning,
  isWriting,
  status,
  nfcCompatMessage,
  collectedSpots,
  hasScannedWand,
  startScan,
  stopScan,
  writeRecord1,
} = useNfc();

const hunts = ref<Record<number, HuntYear>>({});

onMounted(async () => {
  hunts.value = await loadHunts();
  if (availableYears.value.length > 0) {
    selectedYear.value = availableYears.value[0];
  }
});

const availableYears = computed(() =>
  Object.keys(hunts.value)
    .map(Number)
    .sort((a, b) => b - a),
);

const selectedYear = ref(0);

const selectedHunt = computed<HuntYear | null>(
  () => hunts.value[selectedYear.value] ?? null,
);

const selectedCollectedIds = computed<string[]>(() =>
  (collectedSpots.value[selectedYear.value] ?? []).map(String),
);

const yearProgress = computed(() => {
  const result: Record<number, { collected: number; total: number }> = {};
  for (const year of availableYears.value) {
    const hunt = hunts.value[year];
    const total = hunt ? Object.keys(hunt.spots).length : 0;
    const collected = (collectedSpots.value[year] ?? []).length;
    result[year] = { collected, total };
  }
  return result;
});
</script>

<style scoped>
.scan-section {
  padding: 2rem;
  border-top: 1px solid var(--border);
}

.scan-section h2 {
  margin: 0 0 0.5rem;
}

@media (max-width: 1024px) {
  .scan-section {
    padding: 1.5rem 1.25rem;
  }
}
</style>
