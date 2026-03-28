<template>
  <section class="hunt-view">
    <!-- Hunt header -->
    <div class="hunt-header glass-card">
      <div class="banner-wrapper">
        <img
          :src="hunt.image"
          :alt="hunt.imageAlt"
          class="banner-image"
          loading="lazy"
        />
        <div class="banner-overlay"></div>
        <span class="year-badge">{{ hunt.year }}</span>
      </div>
      <div class="hunt-meta">
        <h2 class="hunt-title">{{ hunt.title }}</h2>
        <p class="hunt-description">{{ hunt.description }}</p>
        <div class="progress-row">
          <div class="progress-bar-track">
            <div
              class="progress-bar-fill"
              :class="{ complete: progressPercent === 100 }"
              :style="{ width: progressPercent + '%' }"
            />
            <div class="progress-shimmer" />
          </div>
          <span class="progress-label">
            {{ collectedCount }}<span class="progress-sep">/</span
            >{{ totalCount }}
          </span>
        </div>
        <p class="progress-text">
          <template v-if="collectedCount === totalCount && totalCount > 0">
            <span class="complete-text">&#10024; All spots collected!</span>
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
        v-for="([spotId, spot], index) in sortedSpots"
        :key="spotId"
        :spot-id="spotId"
        :spot="spot"
        :collected="collectedSet.has(spotId)"
        :style="{ animationDelay: index * 0.06 + 's' }"
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
  padding: 0 1rem;
}

.hunt-header {
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.banner-wrapper {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--code-bg);
}

.banner-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.banner-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    transparent 40%,
    rgba(11, 11, 26, 0.8) 100%
  );
}

.year-badge {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  font-family: var(--heading);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--accent);
  background: rgba(11, 11, 26, 0.7);
  backdrop-filter: blur(8px);
  padding: 0.3rem 0.75rem;
  border-radius: 20px;
  border: 1px solid var(--accent-border);
  letter-spacing: 1px;
}

.hunt-meta {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.hunt-title {
  margin: 0;
  font-size: 1.4rem;
  line-height: 1.2;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hunt-description {
  margin: 0;
  color: var(--text);
  line-height: 1.6;
  font-size: 0.9rem;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.progress-bar-track {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(120, 90, 180, 0.2);
  overflow: hidden;
  position: relative;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 3px;
  background: var(--gradient-gold);
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.progress-bar-fill.complete {
  background: linear-gradient(135deg, var(--collected), #6ee7b7);
  box-shadow: var(--glow-green);
}

.progress-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.15) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2.5s infinite;
}

.progress-label {
  font-family: var(--heading);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--accent);
  white-space: nowrap;
}

.progress-sep {
  color: var(--text);
  opacity: 0.4;
  margin: 0 0.15rem;
}

.progress-text {
  font-size: 0.8rem;
  color: var(--text);
  margin: 0;
}

.complete-text {
  color: var(--collected);
  font-weight: 600;
}

.spots-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 1rem;
}
</style>
