<template>
  <div id="app">
    <MagicBackground />

    <!-- NFC compatibility error banner -->
    <div v-if="nfcCompatMessage" class="nfc-banner">
      {{ nfcCompatMessage }}
    </div>

    <!-- NFC status toast -->
    <NfcToast
      :visible="nfcToastVisible"
      :is-writing="isWriting"
      :status="status"
    />

    <div class="page-content">
      <Transition name="page-fade" mode="out-in">
        <HuntPage
          v-if="currentPage === 'hunt'"
          key="hunt"
          :is-scanning="isScanning"
          :show-scanned-view="showScannedView"
          :scan-reveal-active="scanRevealActive"
          :wand-metadata="wandMetadata"
          :wand-years="wandYears"
          :selected-year="selectedYear"
          :selected-hunt="selectedHunt"
          :selected-collected-ids="selectedCollectedIds"
          :year-progress="yearProgress"
          @update:selected-year="selectedYearOverride = $event"
        />

        <ArchivePage
          v-else-if="currentPage === 'archive'"
          key="archive"
          :all-years="allYears"
          :archive-year="archiveYear"
          :archive-hunt="archiveHunt"
          :archive-collected-ids="archiveCollectedIds"
          :year-progress="yearProgress"
          @update:archive-year="archiveYear = $event"
        />

        <div v-else-if="currentPage === 'toybox'" key="toybox" class="page">
          <PageHero
            :icon="IconWandTweaker"
            :eyebrow="t('toybox.eyebrow')"
            :title="t('toybox.title')"
            :copy="t('toybox.copy')"
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

    <BottomNav v-model="currentPage" :tabs="navTabs" />

    <NfcConsentOverlay
      :visible="showNfcConsent"
      @consent="handleNfcConsent"
      @skip="showNfcConsent = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useNfc } from "./composables/useNfc";
import { useRouter } from "./composables/useRouter";
import { useWandReveal } from "./composables/useWandReveal";
import { useHuntData } from "./composables/useHuntData";
import { useYearSelection } from "./composables/useYearSelection";
import { usePwa } from "./composables/usePwa";
import MagicBackground from "./components/MagicBackground.vue";
import PageHero from "./components/PageHero.vue";
import BottomNav from "./components/BottomNav.vue";
import ToyboxPanel from "./components/ToyboxPanel.vue";
import IconHuntMap from "./components/icons/IconHuntMap.vue";
import IconArchive from "./components/icons/IconArchive.vue";
import IconWandTweaker from "./components/icons/IconWandTweaker.vue";
import type { NavTab } from "./components/BottomNav.vue";
import type { ToyRecordWriteRequest } from "./utils/toyboxRecord1";

import NfcToast from "./components/NfcToast.vue";
import NfcConsentOverlay from "./components/NfcConsentOverlay.vue";
import HuntPage from "./components/HuntPage.vue";
import ArchivePage from "./components/ArchivePage.vue";

const { t } = useI18n();

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

const { canInstall: canInstallPwa, promptInstall } = usePwa();

const showNfcConsent = ref(false);

// Routing
const { currentPage } = useRouter();

// Hunt data
const { hunts, allYears, availableSpotIdsByYear } = useHuntData();

// Wand reveal animation
const hasScannedWand = computed(
  () =>
    wandMetadata.value !== null || Object.keys(collectedSpots.value).length > 0,
);
const { scanRevealActive, showScannedView } = useWandReveal(hasScannedWand);

// Year selection
const {
  wandYears,
  selectedYear,
  selectedYearOverride,
  selectedHunt,
  selectedCollectedIds,
  archiveYear,
  archiveHunt,
  archiveCollectedIds,
  yearProgress,
} = useYearSelection(collectedSpots, hunts, allYears);

const navTabs = computed<NavTab[]>(() => [
  { id: "hunt", label: t("nav.hunt"), icon: IconHuntMap },
  { id: "archive", label: t("nav.archive"), icon: IconArchive },
  { id: "toybox", label: t("nav.toybox"), icon: IconWandTweaker },
]);

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

function handleToyboxWrite(request: ToyRecordWriteRequest) {
  void writeRecord1(request);
}

async function handleNfcConsent() {
  showNfcConsent.value = false;
  const result = await beginScanning();
  if (result === "needs-gesture") {
    // Browser denied again — user probably dismissed the system prompt
    nfcCompatMessage.value = t("nfc.permission_denied");
  }
}

onMounted(async () => {
  if (!nfcSupported()) {
    nfcCompatMessage.value = t("nfc.not_supported");
  } else {
    // Try to start scanning silently; show consent popup only if a user gesture is needed
    const result = await beginScanning();
    if (result === "needs-gesture") {
      showNfcConsent.value = true;
    }
  }
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
</style>
