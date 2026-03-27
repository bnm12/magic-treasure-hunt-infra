<template>
  <div class="year-selector" role="tablist" aria-label="Select hunt year">
    <button
      v-for="year in years"
      :key="year"
      class="year-tab"
      :class="{ active: year === modelValue }"
      role="tab"
      :aria-selected="year === modelValue"
      type="button"
      @click="$emit('update:modelValue', year)"
    >
      {{ year }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  years: number[];
  modelValue: number;
}>();

defineEmits<{
  'update:modelValue': [year: number];
}>();
</script>

<style scoped>
.year-selector {
  display: flex;
  gap: 0.5rem;
  padding: 1.25rem 2rem;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}

.year-tab {
  padding: 0.4rem 1.1rem;
  border-radius: 20px;
  border: 1.5px solid var(--border);
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.year-tab:hover {
  border-color: var(--accent-border);
  color: var(--accent);
}

.year-tab.active {
  background: var(--accent-bg);
  border-color: var(--accent-border);
  color: var(--accent);
  font-weight: 600;
}

@media (max-width: 1024px) {
  .year-selector {
    padding: 1rem 1.25rem;
  }
}
</style>
