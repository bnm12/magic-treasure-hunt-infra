<template>
  <nav class="bottom-nav" role="tablist" aria-label="Main navigation">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="nav-tab"
      :class="{ active: tab.id === modelValue }"
      role="tab"
      :aria-selected="tab.id === modelValue"
      type="button"
      @click="$emit('update:modelValue', tab.id)"
    >
      <span class="nav-icon" v-html="tab.icon"></span>
      <span class="nav-label">{{ tab.label }}</span>
      <span v-if="tab.id === modelValue" class="nav-indicator"></span>
    </button>
  </nav>
</template>

<script setup lang="ts">
export interface NavTab {
  id: string;
  label: string;
  icon: string;
}

defineProps<{
  modelValue: string;
  tabs: NavTab[];
}>();

defineEmits<{
  "update:modelValue": [id: string];
}>();
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 0.4rem 0.5rem;
  padding-bottom: calc(0.4rem + env(safe-area-inset-bottom, 0px));
  background: rgba(11, 11, 26, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-top: 1px solid rgba(155, 109, 255, 0.15);
  box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.4);
}

.nav-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: var(--text);
  font-family: var(--sans);
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  border-radius: 12px;
  min-width: 4rem;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.nav-tab:hover {
  color: var(--accent);
}

.nav-tab.active {
  color: var(--accent);
}

.nav-icon {
  font-size: 1.4rem;
  line-height: 1;
  transition: transform 0.3s ease, filter 0.3s ease;
}

.nav-tab.active .nav-icon {
  transform: scale(1.15);
  filter: drop-shadow(0 0 8px rgba(212, 168, 67, 0.5));
}

.nav-label {
  transition: color 0.3s ease;
}

.nav-indicator {
  position: absolute;
  top: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background: var(--gradient-gold);
  border-radius: 1px;
  box-shadow: 0 0 8px rgba(212, 168, 67, 0.6);
  animation: indicator-appear 0.3s ease;
}

@keyframes indicator-appear {
  from {
    width: 0;
    opacity: 0;
  }
  to {
    width: 20px;
    opacity: 1;
  }
}
</style>
