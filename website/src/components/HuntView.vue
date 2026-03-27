<template>
  <section class="hunt-view">
    <!-- Hunt header -->
    <div class="hunt-header">
      <div class="banner-wrapper">
        <img
          :src="hunt.image"
          :alt="hunt.imageAlt"
          class="banner-image"
          loading="lazy"
        />
      </div>
      <div class="hunt-meta">
        <span class="year-label">{{ hunt.year }}</span>
        <h2 class="hunt-title">{{ hunt.title }}</h2>
        <p class="hunt-description">{{ hunt.description }}</p>
        <div class="progress-row">
          <div class="progress-bar-track">
            <div
              class="progress-bar-fill"
              :style="{ width: progressPercent + '%' }"
            />
          </div>
          <span class="progress-label">
            {{ collectedCount }} / {{ totalCount }}
          </span>
        </div>
        <p class="progress-text">
          <template v-if="collectedCount === totalCount && totalCount > 0">
            🎉 All spots collected!
          </template>
          <template v-else-if="collectedCount === 0">
            No spots collected yet — tap your wand at a magic spot!
          </template>
          <template v-else>
            {{ totalCount - collectedCount }} spot{{
              totalCount - collectedCount === 1 ? "" : "s"
            }}
            remaining
          </template>
        </p>
      </div>
    </div>

    <!-- Spot grid -->
    <div class="spots-grid">
      <SpotCard
        v-for="[spotId, spot] in sortedSpots"
        :key="spotId"
        :spot="spot"
        :collected="collectedSet.has(spotId)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { HuntYear } from "../utils/spotLoader";
import SpotCard from "./SpotCard.vue";

const props = defineProps<{
  hunt: HuntYear;
  collectedIds: string[];
}>();

const collectedSet = computed(() => new Set(props.collectedIds));

const sortedSpots = computed(() =>
  Object.entries(props.hunt.spots).sort(([aId], [bId]) => {
    const aCol = collectedSet.value.has(aId) ? 0 : 1;
    const bCol = collectedSet.value.has(bId) ? 0 : 1;
    return aCol - bCol;
  }),
);

const totalCount = computed(() => Object.keys(props.hunt.spots).length);
const collectedCount = computed(
  () =>
    Object.keys(props.hunt.spots).filter((id) => collectedSet.value.has(id))
      .length,
);
const progressPercent = computed(() =>
  totalCount.value === 0
    ? 0
    : Math.round((collectedCount.value / totalCount.value) * 100),
);
</script>

<style scoped>
.hunt-view {
  border-top: 1px solid var(--border);
}

.hunt-header {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: center;
  padding: 2rem;
  background: var(--accent-bg);
  border-bottom: 1px solid var(--accent-border);
}

.banner-wrapper {
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  background: var(--code-bg);
}

.banner-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.hunt-meta {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.year-label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1.2px;
  font-weight: 700;
  color: var(--accent);
}

.hunt-title {
  margin: 0;
  font-size: 1.8rem;
  color: var(--text-h);
  line-height: 1.2;
}

.hunt-description {
  margin: 0.25rem 0 0.5rem;
  color: var(--text);
  line-height: 1.6;
  font-size: 0.95rem;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.progress-bar-track {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: var(--border);
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 4px;
  background: var(--accent);
  transition: width 0.4s ease;
}

.progress-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-h);
  white-space: nowrap;
}

.progress-text {
  font-size: 0.875rem;
  color: var(--text);
  margin: 0;
}

.spots-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 2rem;
}

@media (max-width: 1024px) {
  .hunt-header {
    grid-template-columns: 1fr;
    gap: 1.25rem;
    padding: 1.5rem 1.25rem;
  }

  .banner-wrapper {
    aspect-ratio: 16 / 9;
  }

  .hunt-title {
    font-size: 1.4rem;
  }

  .spots-grid {
    padding: 1.25rem;
    gap: 1rem;
  }
}
</style>
