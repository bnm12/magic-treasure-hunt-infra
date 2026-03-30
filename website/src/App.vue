<template>
  <div id="app">
    <MagicBackground />

    <div class="page-content">
      <Transition name="page-fade" mode="out-in">
        <PageLayout
          v-if="currentPage === 'hunt'"
          key="hunt"
          :nfc-compat-message="nfcCompatMessage"
          :nfc-toast-visible="nfcToastVisible"
          :is-writing="isWriting"
          :nfc-status="status"
          :hero-icon="IconSeeking"
          :hero-eyebrow="t('hunt.eyebrow')"
          :hero-title="t('hunt.title')"
          :hero-copy="t('hunt.copy')"
          :hero-show-indicator="true"
          :hero-indicator-active="isScanning"
          :hero-indicator-label="
            isScanning ? t('nfc.indicator_active') : t('nfc.indicator_inactive')
          "
        >
          <HuntPage
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
        </PageLayout>

        <PageLayout
          v-else-if="currentPage === 'archive'"
          key="archive"
          :nfc-compat-message="nfcCompatMessage"
          :nfc-toast-visible="nfcToastVisible"
          :is-writing="isWriting"
          :nfc-status="status"
          :hero-icon="IconArchive"
          :hero-eyebrow="t('archive.eyebrow')"
          :hero-title="t('archive.title')"
          :hero-copy="t('archive.copy')"
          :hero-no-spin="true"
          :hero-compact="true"
        >
          <ArchivePage
            :all-years="allYears"
            :archive-year="archiveYear"
            :archive-hunt="archiveHunt"
            :archive-collected-ids="archiveCollectedIds"
            :year-progress="yearProgress"
            @update:archive-year="archiveYear = $event"
          />
        </PageLayout>

        <PageLayout
          v-else-if="currentPage === 'toybox'"
          key="toybox"
          :nfc-compat-message="nfcCompatMessage"
          :nfc-toast-visible="nfcToastVisible"
          :is-writing="isWriting"
          :nfc-status="status"
          :hero-icon="IconWandTweaker"
          :hero-eyebrow="t('toybox.eyebrow')"
          :hero-title="t('toybox.title')"
          :hero-copy="t('toybox.copy')"
          :hero-compact="true"
        >
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
        </PageLayout>
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
import PageLayout from "./components/PageLayout.vue";
import BottomNav from "./components/BottomNav.vue";
import ToyboxPanel from "./components/ToyboxPanel.vue";
import IconHuntMap from "./components/icons/IconHuntMap.vue";
import IconArchive from "./components/icons/IconArchive.vue";
import IconSeeking from "./components/icons/IconSeeking.vue";
import IconWandTweaker from "./components/icons/IconWandTweaker.vue";
import type { NavTab } from "./components/BottomNav.vue";
import type { ToyRecordWriteRequest } from "./utils/toyboxRecord1";

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
    // Try to start scanning silently only in main app
    const result = await beginScanning();
    if (result === "needs-gesture") {
      showNfcConsent.value = true;
    }
  }
});
</script>
