<template>
  <div class="page">
    <PageHero
      :icon="IconSeeking"
      eyebrow="Tryllestavsprojekt"
      title="Magic Wand Companion"
      copy="Tap your wand at a magic spot to collect it. Scan your wand here to see your progress and hints."
      :show-indicator="true"
      :indicator-active="isScanning"
      :indicator-label="isScanning ? 'NFC Active' : 'NFC Off'"
    />

    <WandInfo v-if="showScannedView" :metadata="wandMetadata" />

    <template v-if="showScannedView && wandYears.length > 0">
      <YearSelector
        v-if="wandYears.length > 1"
        :model-value="selectedYear"
        @update:model-value="emit('update:selectedYear', $event)"
        :years="wandYears"
        :progress="yearProgress"
      />
      <HuntView
        v-if="selectedHunt"
        :hunt="selectedHunt"
        :collected-ids="selectedCollectedIds"
      />
    </template>

    <div v-else class="empty-state">
      <MagicScanCircle
        v-if="!showScannedView"
        :activated="scanRevealActive"
      >
        <IconSeeking class="scan-circle__icon" aria-hidden="true" />
      </MagicScanCircle>
      <IconSeeking v-else class="empty-icon" aria-hidden="true" />
      <p>
        {{
          showScannedView
            ? "No hunt data found on your wand yet. Visit a magic spot!"
            : scanRevealActive
              ? "Your wand is responding..."
              : isScanning
                ? "Hold your wand close to begin your magical adventure!"
                : "Preparing NFC scanner..."
        }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHero from "./PageHero.vue";
import WandInfo from "./WandInfo.vue";
import YearSelector from "./YearSelector.vue";
import HuntView from "./HuntView.vue";
import MagicScanCircle from "./MagicScanCircle.vue";
import IconSeeking from "./icons/IconSeeking.vue";
import type { HuntYear } from "../utils/spotLoader";

defineProps<{
  isScanning: boolean;
  showScannedView: boolean;
  scanRevealActive: boolean;
  wandMetadata: { name: string; creationYear: number } | null;
  wandYears: number[];
  selectedYear: number;
  selectedHunt: HuntYear | null;
  selectedCollectedIds: string[];
  yearProgress: Record<number, { collected: number; total: number }>;
}>();

const emit = defineEmits<{
  "update:selectedYear": [year: number];
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
  position: relative;
  min-height: 50vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
}

.empty-icon {
  font-size: 3rem;
  color: var(--accent);
  display: block;
  margin-bottom: 1rem;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 0 3px rgba(11, 11, 26, 0.9))
    drop-shadow(0 0 8px rgba(212, 168, 67, 0.25));
  position: relative;
  z-index: 2;
}

.empty-state p {
  position: relative;
  z-index: 1;
  max-width: 34ch;
}
</style>
