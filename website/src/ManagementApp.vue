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
import { ref, onMounted } from "vue";
import MagicBackground from "./components/MagicBackground.vue";
import InitializePage from "./components/InitializePage.vue";
import ConfigureSpotPage from "./components/ConfigureSpotPage.vue";
import BottomNav from "./components/BottomNav.vue";
import IconWandTweaker from "./components/icons/IconWandTweaker.vue";
import IconWand from "./components/icons/IconWand.vue";
import { useNfc } from "./composables/useNfc";

const { isWriting, initializeWand, nfcCompatMessage, nfcSupported } = useNfc();
const currentYear = new Date().getFullYear();
const currentTab = ref("initialize");
const tabs = [
  { id: "initialize", label: "Initialize Wand", icon: IconWandTweaker },
  { id: "configureSpot", label: "Configure Spot", icon: IconWand },
];

onMounted(async () => {
  if (!nfcSupported()) {
    nfcCompatMessage.value =
      "Web NFC is not available. Open this page in Chrome on Android over HTTPS.";
  }
});
</script>

<style scoped></style>
