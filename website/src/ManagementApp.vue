<template>
  <div id="management-app">
    <MagicBackground />

    <!-- NFC compatibility error banner -->
    <div v-if="nfcCompatMessage" class="nfc-banner">
      {{ nfcCompatMessage }}
    </div>

    <div class="page-content">
      <Transition name="page-fade" mode="out-in">
        <InitializePage
          v-if="currentTab === 'initialize'"
          key="initialize"
          :year="currentYear"
          :is-writing="isWriting"
          :initialize-wand="initializeWand"
        />
        <ConfigureSpotPage
          v-else-if="currentTab === 'configureSpot'"
          key="configureSpot"
        />
      </Transition>
    </div>
    <BottomNav v-model="currentTab" :tabs="tabs" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import MagicBackground from "./components/MagicBackground.vue";
import InitializePage from "./components/InitializePage.vue";
import ConfigureSpotPage from "./components/ConfigureSpotPage.vue";
import BottomNav from "./components/BottomNav.vue";
import IconWandTweaker from "./components/icons/IconWandTweaker.vue";
import IconWand from "./components/icons/IconWand.vue";
import { useNfc } from "./composables/useNfc";

const { t } = useI18n();
const { isWriting, initializeWand, nfcCompatMessage, nfcSupported } = useNfc();
const currentYear = new Date().getFullYear();
const currentTab = ref("initialize");
const tabs = computed(() => [
  { id: "initialize", label: t("init_page.title"), icon: IconWandTweaker },
  { id: "configureSpot", label: t("configure_page.title"), icon: IconWand },
]);

onMounted(async () => {
  if (!nfcSupported()) {
    nfcCompatMessage.value = t("nfc.not_supported");
  }
});
</script>

<style scoped></style>
