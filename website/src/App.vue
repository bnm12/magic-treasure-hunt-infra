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
        <!-- --- INITIALIZE PAGE --- -->
        <InitializePage
          v-if="currentPage === 'initialize'"
          key="initialize"
          :year="initializeYear"
          :is-writing="isWriting"
          :initialize-wand="initializeWand"
        />

        <!-- --- HUNT PAGE --- -->
        <div v-else-if="currentPage === 'hunt'" key="hunt" class="page">
          <PageHero
            :icon="hasScannedWand ? IconHuntMap : IconSeeking"
            eyebrow="Tryllestavsprojekt"
            title="Magic Wand Companion"
            copy="Tap your wand at a magic spot to collect it. Scan your wand here to see your progress and hints."
            :show-indicator="true"
            :indicator-active="isScanning"
            :indicator-label="isScanning ? 'NFC Active' : 'NFC Off'"
          />

          <WandInfo v-if="showScannedView" :metadata="wandMetadata" />

          <!-- Show hunts after wand is scanned (active hunt always visible) -->
          <template v-if="showScannedView && wandYears.length > 0">
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
            <MagicScanCircle
              v-if="!showScannedView"
              :activated="scanRevealActive"
            >
              <IconSeeking class="scan-circle__icon" aria-hidden="true" />
            </MagicScanCircle>
            <IconSeeking v-else class="empty-icon" aria-hidden="true" />
            <p>
              {{
                showScannedView
                  ? "No hunt data found on your wand yet. Visit a magic spot!"
                  : scanRevealActive
                    ? "Your wand is responding..."
                    : isScanning
                      ? "Hold your wand close to begin your magical adventure!"
                      : "Preparing NFC scanner..."
              }}
            </p>
          </div>
        </div>

        <!-- --- ARCHIVE PAGE --- -->
        <div v-else-if="currentPage === 'archive'" key="archive" class="page">
          <PageHero
            :icon="IconArchive"
            eyebrow="Past & Present"
            title="Hunt Archive"
            copy="Browse all hunts — including ones you may have missed."
            :no-spin="true"
            :compact="true"
          />

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

        <!-- --- TOYBOX PAGE --- -->
        <div v-else-if="currentPage === 'toybox'" key="toybox" class="page">
          <PageHero
            :icon="IconWandTweaker"
            eyebrow="Wand Workshop"
            title="Toybox"
            copy="Initialize a wand and tune record 1 without disturbing your hunt progress."
            :compact="true"
          />
          <ToyboxPanel
            :is-writing="isWriting"
            :initialize-wand="initializeWand"
            :unlock-test-spot="unlockTestSpot"
            :show-install-action="canInstallPwa"
            :active-hunt-year="allYears[0] ?? 0"
            :available-years="allYears"
            :available-spot-ids-by-year="availableSpotIdsByYear"
            @write="handleToyboxWrite"
            @install="promptInstall"
          />
        </div>
      </Transition>
    </div>

    <BottomNav
      v-if="currentPage !== 'initialize'"
      v-model="currentPage"
      :tabs="navTabs"
    />

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
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { useNfc } from "./composables/useNfc";
import { loadHunts } from "./utils/spotLoader";
import type { HuntYear } from "./utils/spotLoader";
import MagicBackground from "./components/MagicBackground.vue";
import MagicScanCircle from "./components/MagicScanCircle.vue";
import PageHero from "./components/PageHero.vue";
import BottomNav from "./components/BottomNav.vue";
import HuntView from "./components/HuntView.vue";
import YearSelector from "./components/YearSelector.vue";
import ToyboxPanel from "./components/ToyboxPanel.vue";
import InitializePage from "./components/InitializePage.vue";
import WandInfo from "./components/WandInfo.vue";
import IconHuntMap from "./components/icons/IconHuntMap.vue";
import IconArchive from "./components/icons/IconArchive.vue";
import IconWandTweaker from "./components/icons/IconWandTweaker.vue";
import IconSeeking from "./components/icons/IconSeeking.vue";
import type { NavTab } from "./components/BottomNav.vue";
import type { ToyRecordWriteRequest } from "./utils/toyboxRecord1";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

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
  unlockTestSpot,
} = useNfc();

const currentPage = ref("hunt");
const initializeYear = ref(new Date().getFullYear());
const showNfcConsent = ref(false);
const scanRevealActive = ref(false);
const scanRevealComplete = ref(false);
const deferredInstallPrompt = ref<BeforeInstallPromptEvent | null>(null);
const isStandalonePwa = ref(false);
let scanRevealTimer: ReturnType<typeof setTimeout> | undefined;

const navTabs: NavTab[] = [
  { id: "hunt", label: "Hunt", icon: IconHuntMap },
  { id: "archive", label: "Archive", icon: IconArchive },
  { id: "toybox", label: "Toybox", icon: IconWandTweaker },
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

onBeforeUnmount(() => {
  clearTimeout(scanRevealTimer);
  window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.removeEventListener("appinstalled", handleAppInstalled);
});

const canInstallPwa = computed(
  () => deferredInstallPrompt.value !== null && !isStandalonePwa.value,
);

function updateStandaloneState() {
  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean;
  };
  isStandalonePwa.value =
    window.matchMedia("(display-mode: standalone)").matches ||
    navigatorWithStandalone.standalone === true;
}

function handleBeforeInstallPrompt(event: Event) {
  const installEvent = event as BeforeInstallPromptEvent;
  installEvent.preventDefault();
  deferredInstallPrompt.value = installEvent;
}

function handleAppInstalled() {
  deferredInstallPrompt.value = null;
  updateStandaloneState();
}

function handleToyboxWrite(request: ToyRecordWriteRequest) {
  void writeRecord1(request);
}

async function promptInstall() {
  if (!deferredInstallPrompt.value) return;

  await deferredInstallPrompt.value.prompt();
  const choice = await deferredInstallPrompt.value.userChoice;

  if (choice.outcome !== "accepted") {
    return;
  }

  deferredInstallPrompt.value = null;
  updateStandaloneState();
}

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
  updateStandaloneState();
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);

  // Check for /initialize path or query param
  const url = new URL(window.location.href);
  if (
    url.pathname.endsWith("/initialize") ||
    url.pathname.endsWith("/initialize/") ||
    url.searchParams.has("initialize")
  ) {
    currentPage.value = "initialize";
    const yearParam = url.searchParams.get("year");
    if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (!isNaN(year)) {
        initializeYear.value = year;
      }
    }
  }

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
const hasScannedWand = computed(
  () =>
    wandMetadata.value !== null || Object.keys(collectedSpots.value).length > 0,
);

watch(
  () => hasScannedWand.value,
  (scanned) => {
    clearTimeout(scanRevealTimer);

    if (!scanned) {
      scanRevealActive.value = false;
      scanRevealComplete.value = false;
      return;
    }

    scanRevealActive.value = true;
    scanRevealComplete.value = false;
    scanRevealTimer = setTimeout(() => {
      scanRevealActive.value = false;
      scanRevealComplete.value = true;
    }, 900);
  },
);

const showScannedView = computed(
  () => hasScannedWand.value && scanRevealComplete.value,
);

// All years from loaded hunt data (for archive)
const allYears = computed(() =>
  Object.keys(hunts.value)
    .map(Number)
    .sort((a, b) => b - a),
);

// Years to show on the hunt tab: wand years + latest available hunt (so
// the active hunt is always visible even with zero collected spots).
const wandYears = computed(() => {
  const onWand = Object.keys(collectedSpots.value).map(Number);
  const years = onWand.filter((y) => y in hunts.value);
  // Always include the latest available hunt year
  if (allYears.value.length > 0 && !years.includes(allYears.value[0])) {
    years.push(allYears.value[0]);
  }
  return years.sort((a, b) => b - a);
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

const availableSpotIdsByYear = computed(() => {
  const result: Record<number, number[]> = {};
  for (const year of allYears.value) {
    const hunt = hunts.value[year];
    result[year] = hunt
      ? Object.keys(hunt.spots)
          .map(Number)
          .sort((a, b) => a - b)
      : [];
  }
  return result;
});
</script>

<style scoped>
/* --- NFC Banner (errors) --- */
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

/* --- NFC Toast --- */
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

/* --- Empty State --- */
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
  gap: 1.25rem;
}

.empty-icon {
  font-size: 3rem;
  color: var(--accent);
  display: block;
  margin-bottom: 1rem;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 0 3px rgba(11, 11, 26, 0.9))
    drop-shadow(0 0 8px rgba(212, 168, 67, 0.25));
  position: relative;
  z-index: 2;
}

.empty-state p {
  position: relative;
  z-index: 1;
  max-width: 34ch;
}

/* --- Page layout --- */
.page {
  animation: reveal-up 0.35s ease;
}

/* --- NFC Consent Overlay --- */
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
