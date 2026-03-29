<template>
  <div id="management-app">
    <MagicBackground />

    <div class="mgmt-shell">
      <header class="mgmt-header">
        <a :href="mainAppUrl" class="back-link" aria-label="Back to hunt app">
          <span class="back-arrow" aria-hidden="true">←</span>
          <span class="back-label">Hunt App</span>
        </a>
        <div class="mgmt-title">
          <span class="mgmt-title-icon" aria-hidden="true">⚙</span>
          <span class="mgmt-title-text">Management</span>
        </div>
        <div class="mgmt-header-spacer" aria-hidden="true"></div>
      </header>
      <nav class="mgmt-tabs" role="tablist" aria-label="Management tools">
        <button
          class="mgmt-tab"
          :class="{ active: activeTool === 'initialize' }"
          role="tab"
          :aria-selected="activeTool === 'initialize'"
          type="button"
          @click="activeTool = 'initialize'"
        >
          <IconWandTweaker class="mgmt-tab-icon" aria-hidden="true" />
          <span>Initialize Wand</span>
        </button>
        <button
          class="mgmt-tab"
          :class="{ active: activeTool === 'configureSpot' }"
          role="tab"
          :aria-selected="activeTool === 'configureSpot'"
          type="button"
          @click="activeTool = 'configureSpot'"
        >
          <IconWand class="mgmt-tab-icon" aria-hidden="true" />
          <span>Configure Spot</span>
        </button>
      </nav>
      <main class="mgmt-content">
        <Transition name="mgmt-fade" mode="out-in">
          <InitializePage
            v-if="activeTool === 'initialize'"
            key="initialize"
            :year="currentYear"
            :is-writing="isWriting"
            :initialize-wand="initializeWand"
          />
          <ConfigureSpotPage
            v-else-if="activeTool === 'configureSpot'"
            key="configureSpot"
          />
        </Transition>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import MagicBackground from "../components/MagicBackground.vue";
import InitializePage from "../components/InitializePage.vue";
import ConfigureSpotPage from "../components/ConfigureSpotPage.vue";
import IconWandTweaker from "../components/icons/IconWandTweaker.vue";
import IconWand from "../components/icons/IconWand.vue";
import { useNfc } from "../composables/useNfc";
import { resolveAppUrl } from "../utils/appUrl";

const { isWriting, initializeWand } = useNfc();
type Tool = "initialize" | "configureSpot";
const activeTool = ref<Tool>("initialize");
const currentYear = new Date().getFullYear();
const mainAppUrl = resolveAppUrl("../");
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
.mgmt-shell {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}
.mgmt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: rgba(11, 11, 26, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 50;
}
.back-link {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--accent);
  text-decoration: none;
  font-size: 0.8rem;
  font-weight: 600;
  opacity: 0.85;
  transition: opacity 0.2s ease;
  min-width: 5rem;
}
.back-link:hover {
  opacity: 1;
}
.back-arrow {
  font-size: 1rem;
  line-height: 1;
}
.mgmt-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--heading);
  font-size: 0.9rem;
  font-weight: 600;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.mgmt-title-icon {
  font-size: 1rem;
  -webkit-text-fill-color: var(--accent);
  filter: drop-shadow(0 0 6px rgba(212, 168, 67, 0.4));
}
.mgmt-header-spacer {
  min-width: 5rem;
}
.mgmt-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  background: rgba(11, 11, 26, 0.6);
  backdrop-filter: blur(8px);
}
.mgmt-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.75rem 0.5rem 0.65rem;
  border: none;
  background: transparent;
  color: var(--text);
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
}
.mgmt-tab:hover {
  color: var(--accent);
}
.mgmt-tab.active {
  color: var(--accent);
}
.mgmt-tab.active::after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 10%;
  right: 10%;
  height: 2px;
  background: var(--gradient-gold);
  border-radius: 1px;
  box-shadow: 0 0 8px rgba(212, 168, 67, 0.5);
  animation: indicator-appear 0.25s ease;
}
.mgmt-tab-icon {
  font-size: 1.3rem;
  transition: transform 0.25s ease, filter 0.25s ease;
}
.mgmt-tab.active .mgmt-tab-icon {
  transform: scale(1.1);
  filter: drop-shadow(0 0 6px rgba(212, 168, 67, 0.4));
}
.mgmt-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.mgmt-fade-enter-active,
.mgmt-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.mgmt-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.mgmt-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
@keyframes indicator-appear {
  from { width: 0; opacity: 0; left: 50%; right: 50%; }
  to   { left: 10%; right: 10%; opacity: 1; }
}
@media (max-width: 600px) {
  .mgmt-header {
    padding: 0.65rem 1rem;
  }
  .mgmt-title {
    font-size: 0.82rem;
  }
  .back-label {
    display: none;
  }
  .back-arrow {
    font-size: 1.1rem;
  }
}
</style>
