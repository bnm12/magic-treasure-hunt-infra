<template>
  <div id="app">
    <MagicBackground />

    <div class="page-content">
      <Transition name="page-fade" mode="out-in">
        <!-- ═══ HUNT PAGE ═══ -->
        <div v-if="currentPage === 'hunt'" key="hunt" class="page">
          <header class="hero-panel">
            <span class="hero-sparkle" aria-hidden="true">&#10022;</span>
            <p class="eyebrow">Tryllestavsprojekt</p>
            <h1 class="hero-title">Magic Wand Companion</h1>
            <p class="hero-copy">
              Tap your wand at a magic spot to collect it.
              <br />Scan your wand here to see your progress and hints.
            </p>
          </header>

          <WandInfo :metadata="wandMetadata" />

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

          <div v-else class="empty-state">
            <span class="empty-icon" aria-hidden="true">&#9733;</span>
            <p>Scan your wand to begin your magical adventure!</p>
          </div>
        </div>

        <!-- ═══ SCAN PAGE ═══ -->
        <div v-else-if="currentPage === 'scan'" key="scan" class="page">
          <section class="scan-section">
            <div class="section-title">
              <span class="icon" aria-hidden="true">&#10024;</span>
              <h2>Wand Scan</h2>
            </div>
            <p class="nfc-note">
              Web NFC works on compatible Android browsers in secure contexts
              (HTTPS).
            </p>

            <div v-if="nfcCompatMessage" class="nfc-compat">
              {{ nfcCompatMessage }}
            </div>

            <div class="scan-visual">
              <div class="wand-animation" :class="{ scanning: isScanning }">
                <span class="wand-emoji" aria-hidden="true">&#10035;</span>
              </div>
              <p class="scan-hint">
                {{
                  isScanning
                    ? "Hold your wand close..."
                    : "Tap scan and hold your wand to your phone"
                }}
              </p>
            </div>

            <div class="nfc-controls">
              <button
                :disabled="isScanning"
                @click="startScan"
                type="button"
                class="counter"
              >
                {{ isScanning ? "&#10024; Scanning..." : "&#9733; Scan Wand" }}
              </button>
              <button
                :disabled="!isScanning"
                @click="stopScan"
                type="button"
                class="counter btn-secondary"
              >
                Stop
              </button>
            </div>

            <p v-if="status" class="nfc-status" aria-live="polite">
              {{ status }}
            </p>
          </section>
        </div>

        <!-- ═══ TOYBOX PAGE ═══ -->
        <div v-else-if="currentPage === 'toybox'" key="toybox" class="page">
          <ToyboxPanel
            :has-scanned-wand="hasScannedWand()"
            :is-writing="isWriting"
            :initialize-wand="initializeWand"
            @write="({ action, payload }) => writeRecord1(action, payload)"
          />
        </div>
      </Transition>
    </div>

    <BottomNav v-model="currentPage" :tabs="navTabs" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useNfc } from "./composables/useNfc";
import { loadHunts } from "./utils/spotLoader";
import type { HuntYear } from "./utils/spotLoader";
import MagicBackground from "./components/MagicBackground.vue";
import BottomNav from "./components/BottomNav.vue";
import HuntView from "./components/HuntView.vue";
import YearSelector from "./components/YearSelector.vue";
import ToyboxPanel from "./components/ToyboxPanel.vue";
import WandInfo from "./components/WandInfo.vue";
import type { NavTab } from "./components/BottomNav.vue";

const {
  isScanning,
  isWriting,
  status,
  nfcCompatMessage,
  collectedSpots,
  wandMetadata,
  hasScannedWand,
  startScan,
  stopScan,
  writeRecord1,
  initializeWand,
} = useNfc();

const currentPage = ref("hunt");

const navTabs: NavTab[] = [
  { id: "hunt", label: "Hunt", icon: "&#9733;" },
  { id: "scan", label: "Scan", icon: "&#10024;" },
  { id: "toybox", label: "Toybox", icon: "&#9881;" },
];

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
    const collectedIds = (collectedSpots.value[year] ?? []).filter(
      (id) => hunt && String(id) in hunt.spots,
    );
    const collected = collectedIds.length;
    result[year] = { collected, total };
  }
  return result;
});
</script>

<style scoped>
/* ═══ Hero Section ═══ */
.hero-panel {
  text-align: center;
  padding: 2.5rem 1.5rem 2rem;
  position: relative;
}

.hero-sparkle {
  font-size: 2rem;
  color: var(--accent);
  display: block;
  margin-bottom: 0.5rem;
  animation: sparkle-spin 4s linear infinite;
  filter: drop-shadow(0 0 10px rgba(212, 168, 67, 0.5));
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--accent2);
  margin-bottom: 0.25rem;
}

.hero-title {
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 1.75rem;
  margin: 0.25rem 0 0.75rem;
  line-height: 1.2;
}

.hero-copy {
  color: var(--text);
  font-size: 0.9rem;
  line-height: 1.6;
  max-width: 32ch;
  margin: 0 auto;
}

/* ═══ Empty State ═══ */
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--text);
}

.empty-icon {
  font-size: 3rem;
  color: var(--accent);
  display: block;
  margin-bottom: 1rem;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 0 12px rgba(212, 168, 67, 0.4));
}

/* ═══ Scan Page ═══ */
.scan-section {
  padding: 2rem 1.5rem;
}

.scan-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 0;
  gap: 1rem;
}

.wand-animation {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 2px solid var(--accent-border);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.5s ease;
  position: relative;
}

.wand-animation::before {
  content: "";
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid transparent;
  transition: border-color 0.5s ease;
}

.wand-animation.scanning {
  border-color: var(--accent);
  box-shadow: var(--glow-gold);
  animation: pulse-glow 2s ease-in-out infinite;
}

.wand-animation.scanning::before {
  border-color: var(--accent-border);
  animation: spin-ring 3s linear infinite;
}

.wand-emoji {
  font-size: 2.5rem;
  transition: transform 0.5s ease;
}

.wand-animation.scanning .wand-emoji {
  animation: float 2s ease-in-out infinite;
  filter: drop-shadow(0 0 12px rgba(212, 168, 67, 0.6));
}

.scan-hint {
  font-size: 0.9rem;
  color: var(--text);
  text-align: center;
}

.btn-secondary {
  color: var(--text) !important;
  border-color: var(--border) !important;
}

.btn-secondary:hover {
  border-color: var(--text) !important;
  box-shadow: none !important;
}

@keyframes spin-ring {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* ═══ Page layout ═══ */
.page {
  animation: reveal-up 0.35s ease;
}
</style>
