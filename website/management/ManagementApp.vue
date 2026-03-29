<template>
  <div id="management-app">
    <MagicBackground />
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
import { ref } from "vue";
import MagicBackground from "../src/components/MagicBackground.vue";
import InitializePage from "../src/components/InitializePage.vue";
import ConfigureSpotPage from "../src/components/ConfigureSpotPage.vue";
import BottomNav from "../src/components/BottomNav.vue";
import IconWandTweaker from "../src/components/icons/IconWandTweaker.vue";
import IconWand from "../src/components/icons/IconWand.vue";
import { useNfc } from "../src/composables/useNfc";

const { isWriting, initializeWand } = useNfc();
const currentYear = new Date().getFullYear();
const currentTab = ref("initialize");
const tabs = [
  { id: "initialize", label: "Initialize Wand", icon: IconWandTweaker },
  { id: "configureSpot", label: "Configure Spot", icon: IconWand },
];
</script>

<style scoped></style>
