<template>
  <div>
    <p v-if="isLoading" class="empty-state">{{ t('archive.loading') }}</p>

    <template v-else-if="uiYears.length > 0">
      <YearSelector
        v-if="uiYears.length > 1"
        :model-value="archiveYear"
        @update:model-value="emit('update:archiveYear', $event)"
        :years="uiYears"
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
      <p>{{ t('archive.empty') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import YearSelector from "./YearSelector.vue";
import HuntView from "./HuntView.vue";
import type { HuntYear } from "../utils/huntCatalog";

const { t } = useI18n();

defineProps<{
  uiYears: number[];
  isLoading: boolean;
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
