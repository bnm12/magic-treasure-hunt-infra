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
import MagicBackground from "../components/MagicBackground.vue";
import InitializePage from "../components/InitializePage.vue";
import ConfigureSpotPage from "../components/ConfigureSpotPage.vue";
import BottomNav from "../components/BottomNav.vue";
import IconWandTweaker from "../components/icons/IconWandTweaker.vue";
import IconWand from "../components/icons/IconWand.vue";
import { useNfc } from "../composables/useNfc";

const { isWriting, initializeWand } = useNfc();
const currentYear = new Date().getFullYear();
const currentTab = ref("initialize");
const tabs = [
  { id: "initialize", label: "Initialize Wand", icon: IconWandTweaker },
  { id: "configureSpot", label: "Configure Spot", icon: IconWand },
];
</script>

<style scoped>
#management-app {
  max-width: 100%;
  margin: 0 auto;
  min-height: 100svh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  position: relative;
  isolation: isolate;
  overflow-x: hidden;
}
</style>
