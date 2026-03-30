<template>
  <div id="management-app">
    <MagicBackground />

    <div class="page-content">
      <Transition name="page-fade" mode="out-in">
        <PageLayout
          v-if="currentPage === 'initialize'"
          key="initialize"
          :nfc-compat-message="nfcCompatMessage"
          :nfc-toast-visible="nfcToastVisible"
          :is-writing="isWriting"
          :nfc-status="status"
          :hero-icon="IconWandTweaker"
          :hero-eyebrow="t('init_page.eyebrow')"
          :hero-title="t('init_page.title')"
          :hero-copy="t('init_page.copy', { year: currentYear })"
          :hero-compact="true"
        >
          <InitializePage />
        </PageLayout>

        <PageLayout
          v-else-if="currentPage === 'configureSpot'"
          key="configureSpot"
          :nfc-compat-message="nfcCompatMessage"
          :show-nfc-banner="false"
          :nfc-toast-visible="false"
          :is-writing="false"
          :nfc-status="''"
          :hero-icon="IconWand"
          :hero-eyebrow="t('configure_page.eyebrow')"
          :hero-title="t('configure_page.title')"
          :hero-copy="t('configure_page.copy')"
          :hero-compact="true"
        >
          <ConfigureSpotPage />
        </PageLayout>
      </Transition>
    </div>

    <BottomNav v-model="currentPage" :tabs="navTabs" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useNfc } from "./composables/useNfc";
import { useRouter } from "./composables/useRouter";
import { useHuntData } from "./composables/useHuntData";
import MagicBackground from "./components/MagicBackground.vue";
import PageLayout from "./components/PageLayout.vue";
import BottomNav from "./components/BottomNav.vue";
import InitializePage from "./components/InitializePage.vue";
import ConfigureSpotPage from "./components/ConfigureSpotPage.vue";
import IconWandTweaker from "./components/icons/IconWandTweaker.vue";
import IconWand from "./components/icons/IconWand.vue";
import type { NavTab } from "./components/BottomNav.vue";

const { t } = useI18n();
const { nfcCompatMessage, isWriting, status, nfcSupported } = useNfc();
const { currentPage } = useRouter();
const { allYears } = useHuntData();

const currentYear = computed(() => {
  return allYears.value[0] ?? new Date().getFullYear();
});

const navTabs = computed<NavTab[]>(() => [
  { id: "initialize", label: t("init_page.title"), icon: IconWandTweaker },
  { id: "configureSpot", label: t("configure_page.title"), icon: IconWand },
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

onMounted(async () => {
  if (!nfcSupported()) {
    nfcCompatMessage.value = t("nfc.not_supported");
  }
});
</script>
