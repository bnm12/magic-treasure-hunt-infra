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
          >&#10003;</span
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
  padding: 1rem 1rem 0.75rem;
  flex-wrap: wrap;
  justify-content: center;
}

.year-tab {
  padding: 0.4rem 1rem 0.45rem;
  border-radius: 12px;
  border: 1.5px solid var(--border);
  background: var(--bg-card);
  backdrop-filter: blur(8px);
  color: var(--text);
  font-family: var(--heading);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.3rem;
  min-width: 5rem;
}

.year-tab:hover {
  border-color: var(--accent-border);
  color: var(--accent);
  box-shadow: var(--glow-gold);
}

.year-tab.active {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 700;
  box-shadow: var(--glow-gold);
}

.year-tab.complete {
  border-color: rgba(52, 211, 153, 0.4);
}

.year-tab.complete.active {
  background: var(--collected-bg);
  border-color: var(--collected);
  color: var(--collected);
  box-shadow: var(--glow-green);
}

.tab-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
}

.complete-badge {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--collected);
}

.tab-track {
  display: block;
  height: 3px;
  border-radius: 2px;
  background: rgba(120, 90, 180, 0.15);
  overflow: hidden;
}

.tab-fill {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: var(--gradient-gold);
  transition: width 0.4s ease;
}

.year-tab.complete .tab-fill {
  background: linear-gradient(135deg, var(--collected), #6ee7b7);
}
</style>
