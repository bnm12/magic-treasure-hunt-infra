<template>
  <div id="app">
    <MagicBackground />

    <!-- NFC status indicator -->
    <div v-if="nfcCompatMessage" class="nfc-banner">
      {{ nfcCompatMessage }}
    </div>
    <Transition name="nfc-toast">
      <div
        v-if="nfcToastVisible"
        class="nfc-toast"
        :class="{ writing: isWriting }"
        aria-live="polite"
      >
        <span class="nfc-toast-icon" aria-hidden="true">
          {{ isWriting ? "&#9998;" : "&#10024;" }}
        </span>
        {{ status }}
        <span v-if="!isWriting" class="toast-sparkles" aria-hidden="true">
          <span class="ts" style="--sx: -18px; --sy: -28px; --d: 0s"
            >&#10022;</span
          >
          <span class="ts" style="--sx: 22px; --sy: -24px; --d: 0.1s"
            >&#10038;</span
          >
          <span class="ts" style="--sx: -10px; --sy: -36px; --d: 0.2s"
            >&#10022;</span
          >
          <span class="ts" style="--sx: 16px; --sy: -32px; --d: 0.15s"
            >&#10047;</span
          >
        </span>
      </div>
    </Transition>

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
            <div class="nfc-indicator" :class="{ active: isScanning }">
              <span class="nfc-dot"></span>
              <span class="nfc-label">{{
                isScanning ? "NFC Active" : "NFC Off"
              }}</span>
            </div>
          </header>

          <WandInfo :metadata="wandMetadata" />

          <!-- Show collected hunts only after wand is scanned -->
          <template v-if="hasScannedWand && wandYears.length > 0">
            <YearSelector
              v-if="wandYears.length > 1"
              v-model="selectedYear"
              :years="wandYears"
              :progress="yearProgress"
            />
            <HuntView
              v-if="selectedHunt"
              :hunt="selectedHunt"
              :collected-ids="selectedCollectedIds"
            />
          </template>

          <div v-else class="empty-state">
            <!-- Pulsating magic circle while awaiting scan -->
            <div v-if="!hasScannedWand" class="magic-circle-wrap" aria-hidden="true">
              <div class="magic-ring ring-outer">
                <span class="rune-track rune-outer">ᚠ·ᚱ·ᛇ·ᛖ·ᚢ·ᚷ·ᛁ·ᛞ·ᚠ·ᚱ·ᛇ·ᛖ</span>
              </div>
              <div class="magic-ring ring-middle">
                <span class="rune-track rune-middle">ᛁ‧ᛞ‧ᚢ‧ᚷ‧ᛖ‧ᛇ‧ᚱ‧ᚠ</span>
              </div>
              <div class="magic-ring ring-inner">
                <span class="rune-track rune-inner">ᚠᚱᛇᛖᚢᚷ</span>
              </div>
              <div class="magic-ring ring-core"></div>
              <span class="circle-star s1">&#10022;</span>
              <span class="circle-star s2">&#10038;</span>
              <span class="circle-star s3">&#10047;</span>
              <span class="circle-star s4">&#10022;</span>
            </div>
            <span class="empty-icon" aria-hidden="true">&#9733;</span>
            <p>
              {{
                hasScannedWand
                  ? "No hunt data found on your wand yet. Visit a magic spot!"
                  : isScanning
                    ? "Hold your wand close to begin your magical adventure!"
                    : "Preparing NFC scanner..."
              }}
            </p>
          </div>
        </div>

        <!-- ═══ ARCHIVE PAGE ═══ -->
        <div v-else-if="currentPage === 'archive'" key="archive" class="page">
          <header class="hero-panel">
            <span class="hero-sparkle" aria-hidden="true">&#128218;</span>
            <p class="eyebrow">Past &amp; Present</p>
            <h1 class="hero-title">Hunt Archive</h1>
            <p class="hero-copy">
              Browse all hunts — including ones you may have missed.
            </p>
          </header>

          <template v-if="allYears.length > 0">
            <YearSelector
              v-if="allYears.length > 1"
              v-model="archiveYear"
              :years="allYears"
              :progress="yearProgress"
            />
            <HuntView
              v-if="archiveHunt"
              :hunt="archiveHunt"
              :collected-ids="archiveCollectedIds"
            />
          </template>

          <div v-else class="empty-state">
            <span class="empty-icon" aria-hidden="true">&#128218;</span>
            <p>No hunts available yet.</p>
          </div>
        </div>

        <!-- ═══ TOYBOX PAGE ═══ -->
        <div v-else-if="currentPage === 'toybox'" key="toybox" class="page">
          <ToyboxPanel
            :is-writing="isWriting"
            :initialize-wand="initializeWand"
            @write="({ action, payload }) => writeRecord1(action, payload)"
          />
        </div>
      </Transition>
    </div>

    <BottomNav v-model="currentPage" :tabs="navTabs" />

    <!-- NFC consent popup -->
    <div v-if="showNfcConsent" class="nfc-consent-overlay">
      <div class="nfc-consent-card">
        <span class="consent-wand" aria-hidden="true">&#10024;</span>
        <h2 class="consent-title">Enable Wand Scanner?</h2>
        <p class="consent-desc">
          Allow NFC scanning so your phone can read magic wands automatically.
        </p>
        <button class="consent-btn" @click="handleNfcConsent">
          Enable NFC
        </button>
        <button class="consent-skip" @click="showNfcConsent = false">
          Skip for now
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
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
  nfcSupported,
  beginScanning,
  writeRecord1,
  initializeWand,
} = useNfc();

const currentPage = ref("hunt");
const showNfcConsent = ref(false);

const navTabs: NavTab[] = [
  { id: "hunt", label: "Hunt", icon: "&#9733;" },
  { id: "archive", label: "Archive", icon: "&#128218;" },
  { id: "toybox", label: "Toybox", icon: "&#9881;" },
];

const hunts = ref<Record<number, HuntYear>>({});

// Show NFC status toast briefly when status changes
const nfcToastVisible = ref(false);
let toastTimer: ReturnType<typeof setTimeout> | undefined;

watch(status, (val) => {
  if (!val) return;
  nfcToastVisible.value = true;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    nfcToastVisible.value = false;
  }, 3000);
});

async function handleNfcConsent() {
  showNfcConsent.value = false;
  const result = await beginScanning();
  if (result === "needs-gesture") {
    // Browser denied again — user probably dismissed the system prompt
    nfcCompatMessage.value =
      "NFC permission was denied. Please allow NFC access in your browser settings and refresh.";
  }
}

onMounted(async () => {
  if (!nfcSupported()) {
    nfcCompatMessage.value =
      "Web NFC is not available. Open this page in Chrome on Android over HTTPS.";
  } else {
    // Try to start scanning silently; show consent popup only if a user gesture is needed
    const result = await beginScanning();
    if (result === "needs-gesture") {
      showNfcConsent.value = true;
    }
  }

  hunts.value = await loadHunts();
  // Default archive tab to most recent year
  if (allYears.value.length > 0) {
    archiveYear.value = allYears.value[0];
  }
});

// Whether a wand has been scanned at least once
const hasScannedWand = computed(() => wandMetadata.value !== null || Object.keys(collectedSpots.value).length > 0);

// All years from loaded hunt data (for archive)
const allYears = computed(() =>
  Object.keys(hunts.value)
    .map(Number)
    .sort((a, b) => b - a),
);

// Only years that appear on the wand (for hunt tab)
const wandYears = computed(() => {
  const onWand = Object.keys(collectedSpots.value).map(Number);
  // Only include years we have hunt data for
  return onWand
    .filter((y) => y in hunts.value)
    .sort((a, b) => b - a);
});

// Auto-select default year when wand data arrives
watch(wandYears, (years) => {
  if (years.length > 0 && !years.includes(selectedYear.value)) {
    selectedYear.value = years[0];
  }
});

const selectedYear = ref(0);
const archiveYear = ref(0);

const selectedHunt = computed<HuntYear | null>(
  () => hunts.value[selectedYear.value] ?? null,
);

const archiveHunt = computed<HuntYear | null>(
  () => hunts.value[archiveYear.value] ?? null,
);

const selectedCollectedIds = computed<string[]>(() =>
  (collectedSpots.value[selectedYear.value] ?? []).map(String),
);

const archiveCollectedIds = computed<string[]>(() =>
  (collectedSpots.value[archiveYear.value] ?? []).map(String),
);

const yearProgress = computed(() => {
  const result: Record<number, { collected: number; total: number }> = {};
  for (const year of allYears.value) {
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
  max-width: 48ch;
  margin: 0 auto;
}

/* ═══ NFC Indicator ═══ */
.nfc-indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 1rem;
  padding: 0.3rem 0.75rem;
  border-radius: 20px;
  background: rgba(120, 90, 180, 0.1);
  border: 1px solid var(--border);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text);
  transition: all 0.5s ease;
}

.nfc-indicator.active {
  border-color: var(--accent-border);
  color: var(--accent);
  background: var(--accent-bg);
}

.nfc-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text);
  transition:
    background 0.5s ease,
    box-shadow 0.5s ease;
}

.nfc-indicator.active .nfc-dot {
  background: var(--accent);
  box-shadow: 0 0 6px rgba(212, 168, 67, 0.6);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

/* ═══ NFC Banner (errors) ═══ */
.nfc-banner {
  position: sticky;
  top: 0;
  z-index: 50;
  padding: 0.6rem 1rem;
  background: rgba(248, 113, 113, 0.12);
  border-bottom: 1px solid rgba(248, 113, 113, 0.3);
  color: var(--danger);
  font-size: 0.8rem;
  text-align: center;
  backdrop-filter: blur(12px);
}

/* ═══ NFC Toast ═══ */
.nfc-toast {
  position: fixed;
  top: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  padding: 0.5rem 1.25rem;
  border-radius: 12px;
  background: rgba(11, 11, 26, 0.92);
  backdrop-filter: blur(16px);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  box-shadow: var(--glow-gold);
  pointer-events: none;
  white-space: nowrap;
}

.nfc-toast.writing {
  border-color: var(--accent2-border);
  color: var(--accent2);
  box-shadow: var(--glow-purple);
  animation: magic-write-pulse 1.5s ease-in-out infinite;
}

.nfc-toast-icon {
  font-size: 0.9rem;
}

.nfc-toast.writing .nfc-toast-icon {
  animation: sparkle-spin 1.5s linear infinite;
}

/* Mini sparkle particles that burst from the toast */
.toast-sparkles {
  position: absolute;
  top: 50%;
  left: 50%;
  pointer-events: none;
}

.ts {
  position: absolute;
  font-size: 0.65rem;
  color: var(--accent);
  animation: sparkle-float 0.7s ease-out forwards;
  animation-delay: var(--d, 0s);
  opacity: 0;
}

.nfc-toast-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.nfc-toast-leave-active {
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}

.nfc-toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

.nfc-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}

/* ═══ Empty State ═══ */
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--text);
  position: relative;
  min-height: 50vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-icon {
  font-size: 3rem;
  color: var(--accent);
  display: block;
  margin-bottom: 1rem;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 0 12px rgba(212, 168, 67, 0.4));
  position: relative;
  z-index: 2;
}

/* When magic circle is showing, center the star on it */
.magic-circle-wrap ~ .empty-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  margin: 0;
  translate: -50% -50%;
  animation: float-centered 3s ease-in-out infinite;
}

.magic-circle-wrap ~ .empty-icon + p {
  margin-top: min(240px, 50vw);
}

@keyframes float-centered {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.empty-state p {
  position: relative;
  z-index: 1;
}

/* ═══ Magic Circle (pre-scan) ═══ */
.magic-circle-wrap {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: min(420px, 90vw);
  height: min(420px, 90vw);
  pointer-events: none;
}

.magic-ring {
  position: absolute;
  border-radius: 50%;
  border: 1.5px solid transparent;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Rune text tracks */
.rune-track {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  letter-spacing: 0.35em;
  opacity: 0.35;
  white-space: nowrap;
}

.rune-outer {
  font-size: 0.7rem;
  color: rgba(155, 109, 255, 0.5);
  animation: rune-fade 4s ease-in-out infinite;
}

.rune-middle {
  font-size: 0.6rem;
  color: rgba(212, 168, 67, 0.5);
  animation: rune-fade 4s ease-in-out 1.2s infinite;
}

.rune-inner {
  font-size: 0.55rem;
  color: rgba(155, 109, 255, 0.6);
  animation: rune-fade 4s ease-in-out 2.4s infinite;
}

@keyframes rune-fade {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.55; }
}

.ring-outer {
  width: 100%;
  height: 100%;
  border-color: rgba(155, 109, 255, 0.15);
  animation: ring-pulse 4s ease-in-out infinite, ring-spin-cw 25s linear infinite;
  box-shadow:
    0 0 40px rgba(155, 109, 255, 0.08),
    inset 0 0 40px rgba(155, 109, 255, 0.05);
}

.ring-middle {
  width: 72%;
  height: 72%;
  border-color: rgba(212, 168, 67, 0.18);
  border-style: dashed;
  animation: ring-pulse 4s ease-in-out 0.8s infinite, ring-spin-ccw 18s linear infinite;
  box-shadow:
    0 0 25px rgba(212, 168, 67, 0.08),
    inset 0 0 25px rgba(212, 168, 67, 0.05);
}

.ring-inner {
  width: 46%;
  height: 46%;
  border-color: rgba(155, 109, 255, 0.22);
  border-width: 1px;
  animation: ring-pulse 4s ease-in-out 1.6s infinite, ring-spin-cw 12s linear infinite;
  box-shadow:
    0 0 18px rgba(155, 109, 255, 0.1),
    inset 0 0 18px rgba(155, 109, 255, 0.06);
}

.ring-core {
  width: 20%;
  height: 20%;
  border-color: rgba(212, 168, 67, 0.3);
  border-width: 1px;
  animation: ring-pulse 4s ease-in-out 2.4s infinite, ring-spin-ccw 8s linear infinite;
  box-shadow:
    0 0 16px rgba(212, 168, 67, 0.15),
    inset 0 0 16px rgba(212, 168, 67, 0.1);
}

/* Stars orbiting the rings */
.circle-star {
  position: absolute;
  font-size: 0.7rem;
  color: var(--accent);
  opacity: 0;
  filter: drop-shadow(0 0 4px rgba(212, 168, 67, 0.6));
  animation: orbit-star 6s ease-in-out infinite;
}

.s1 {
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  animation-delay: 0s;
}

.s2 {
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  animation-delay: 1.5s;
  color: var(--accent2);
  filter: drop-shadow(0 0 4px rgba(155, 109, 255, 0.6));
}

.s3 {
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  animation-delay: 3s;
}

.s4 {
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  animation-delay: 4.5s;
  color: var(--accent2);
  filter: drop-shadow(0 0 4px rgba(155, 109, 255, 0.6));
}

@keyframes ring-pulse {
  0%, 100% {
    opacity: 0.4;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.06);
  }
}

@keyframes ring-spin-cw {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

@keyframes ring-spin-ccw {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(-360deg); }
}

@keyframes orbit-star {
  0%, 100% {
    opacity: 0;
    transform: scale(0.5);
  }
  20% {
    opacity: 0.9;
    transform: scale(1.2);
  }
  80% {
    opacity: 0.6;
    transform: scale(0.9);
  }
}

/* ═══ Page layout ═══ */
.page {
  animation: reveal-up 0.35s ease;
}

/* ═══ NFC Consent Overlay ═══ */
.nfc-consent-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 5, 15, 0.85);
  backdrop-filter: blur(12px);
  padding: 1.5rem;
}

.nfc-consent-card {
  max-width: 340px;
  width: 100%;
  text-align: center;
  padding: 2.5rem 2rem 2rem;
  border-radius: 20px;
  background: var(--surface);
  border: 1px solid var(--accent-border);
  box-shadow:
    var(--glow-gold),
    0 16px 48px rgba(0, 0, 0, 0.6);
  animation: reveal-up 0.4s ease;
}

.consent-wand {
  font-size: 3.5rem;
  display: block;
  margin-bottom: 0.75rem;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 0 16px rgba(212, 168, 67, 0.5));
}

.consent-title {
  font-size: 1.3rem;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 0.75rem;
  line-height: 1.3;
}

.consent-desc {
  color: var(--text);
  font-size: 0.85rem;
  line-height: 1.6;
  margin: 0 0 1.5rem;
}

.consent-btn {
  width: 100%;
  padding: 0.85rem 1.5rem;
  border: none;
  border-radius: 12px;
  background: var(--gradient-gold);
  color: var(--bg);
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  box-shadow: 0 4px 20px rgba(212, 168, 67, 0.3);
}

.consent-btn:active {
  transform: scale(0.97);
}

.consent-skip {
  display: block;
  margin-top: 0.75rem;
  background: none;
  border: none;
  color: var(--text);
  font-size: 0.75rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.consent-skip:hover {
  opacity: 1;
}
</style>
