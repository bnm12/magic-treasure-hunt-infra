<template>
  <div class="page">
    <PageHero
      :icon="IconArchive"
      eyebrow="Past & Present"
      title="Hunt Archive"
      copy="Browse all hunts — including ones you may have missed."
      :no-spin="true"
      :compact="true"
    />

    <template v-if="allYears.length > 0">
      <YearSelector
        v-if="allYears.length > 1"
        :model-value="archiveYear"
        @update:model-value="emit('update:archiveYear', $event)"
        :years="allYears"
        :progress="yearProgress"
      />
      <HuntView
        v-if="archiveHunt"
        :hunt="archiveHunt"
        :collected-ids="archiveCollectedIds"
      />
    </template>

    <div v-else class="empty-state">
      <span class="empty-icon" aria-hidden="true">&#128218;</span>
      <p>No hunts available yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHero from "./PageHero.vue";
import YearSelector from "./YearSelector.vue";
import HuntView from "./HuntView.vue";
import IconArchive from "./icons/IconArchive.vue";
import type { HuntYear } from "../utils/spotLoader";

defineProps<{
  allYears: number[];
  archiveYear: number;
  archiveHunt: HuntYear | null;
  archiveCollectedIds: string[];
  yearProgress: Record<number, { collected: number; total: number }>;
}>();

const emit = defineEmits<{
  "update:archiveYear": [year: number];
}>();
</script>

<style scoped>
.page {
  animation: reveal-up 0.35s ease;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--text);
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}
</style>
