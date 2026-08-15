<template>
  <div id="management-app">
    <MagicBackground />

    <div class="page-content">
      <section
        v-if="isLoading || catalogError || diagnostics.length > 0"
        class="catalog-diagnostics glass-card"
        aria-live="polite"
      >
        <p v-if="isLoading" class="catalog-loading">
          {{ t("catalog.loading") }}
        </p>
        <template v-else>
          <p v-if="catalogError" class="validation-error" role="alert">
            {{ t("catalog.management_error", { error: catalogError.message }) }}
          </p>
          <div v-if="diagnostics.length > 0">
            <h2>{{ t("catalog.management_heading") }}</h2>
            <ul class="diagnostic-list">
              <li v-for="diagnostic in diagnostics" :key="`${diagnostic.year}-${diagnostic.code}-${diagnostic.path ?? ''}`">
                <strong>{{ diagnostic.year }} · {{ diagnostic.code }}</strong>
                <span>{{ diagnostic.message }}</span>
                <code v-if="diagnostic.path">{{ diagnostic.path }}</code>
              </li>
            </ul>
          </div>
        </template>
      </section>

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
const {
  uiYears,
  isLoading,
  diagnostics,
  error: catalogError,
} = useHuntData();

const currentYear = computed(() => {
  return uiYears.value[0] ?? new Date().getFullYear();
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

<style scoped>
.catalog-diagnostics {
  width: 100%;
  max-width: 680px;
  margin: 0 auto 1rem;
  padding: 1rem;
}

.catalog-diagnostics h2 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
}

.catalog-loading {
  color: var(--accent);
  font-size: 0.85rem;
  text-align: center;
}

.validation-error {
  color: var(--danger);
  font-size: 0.85rem;
  text-align: center;
}

.diagnostic-list {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding-left: 1.25rem;
  font-size: 0.8rem;
}

.diagnostic-list li {
  display: grid;
  gap: 0.15rem;
}

.diagnostic-list strong {
  color: var(--text-h);
}

.diagnostic-list code {
  width: fit-content;
}
</style>
