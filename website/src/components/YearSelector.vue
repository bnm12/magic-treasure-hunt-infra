<template>
  <div class="year-selector" role="tablist" aria-label="Select hunt year">
    <button
      v-for="year in years"
      :key="year"
      class="year-tab"
      :class="{ active: year === modelValue, complete: isComplete(year) }"
      role="tab"
      :aria-selected="year === modelValue"
      type="button"
      @click="$emit('update:modelValue', year)"
    >
      <span class="tab-label">
        {{ year }}
        <span
          v-if="isComplete(year)"
          class="complete-badge"
          aria-label="Completed"
          >✓</span
        >
      </span>
      <span class="tab-track" aria-hidden="true">
        <span class="tab-fill" :style="{ width: percent(year) + '%' }" />
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  years: number[];
  modelValue: number;
  progress?: Record<number, { collected: number; total: number }>;
}>();

defineEmits<{
  "update:modelValue": [year: number];
}>();

function percent(year: number): number {
  const p = props.progress?.[year];
  if (!p || p.total === 0) return 0;
  return Math.round((p.collected / p.total) * 100);
}

function isComplete(year: number): boolean {
  const p = props.progress?.[year];
  return !!p && p.total > 0 && p.collected >= p.total;
}
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
  padding: 0.4rem 1.1rem 0.45rem;
  border-radius: 20px;
  border: 1.5px solid var(--border);
  background: transparent;
  color: var(--text);
  font: inherit;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.3rem;
  min-width: 4rem;
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

.year-tab.complete {
  border-color: #22c55e;
}

.year-tab.complete.active {
  background: #f0fdf4;
  border-color: #22c55e;
  color: #16a34a;
}

.tab-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}

.complete-badge {
  font-size: 0.75rem;
  font-weight: 700;
  color: #22c55e;
}

.year-tab.active .complete-badge {
  color: #16a34a;
}

.tab-track {
  display: block;
  height: 3px;
  border-radius: 2px;
  background: var(--border);
  overflow: hidden;
}

.tab-fill {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: var(--accent);
  transition: width 0.3s ease;
}

.year-tab.complete .tab-fill {
  background: #22c55e;
}

@media (max-width: 1024px) {
  .year-selector {
    padding: 1rem 1.25rem;
  }
}
</style>
