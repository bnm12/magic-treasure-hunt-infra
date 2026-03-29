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
            <!-- Milestone rune markers -->
            <span
              v-for="i in totalCount - 1"
              :key="i"
              class="milestone-mark"
              :class="{ reached: i <= collectedCount }"
              :style="{ left: (i / totalCount) * 100 + '%' }"
              aria-hidden="true"
            />
            <div
              class="progress-bar-fill"
              :class="{ complete: progressPercent === 100 }"
              :style="{ width: progressPercent + '%' }"
            >
              <!-- Glowing orb at leading edge -->
              <span
                v-if="progressPercent > 0 && progressPercent < 100"
                class="bar-orb"
                aria-hidden="true"
              />
            </div>
            <div class="progress-shimmer" />
            <!-- Celebration burst at 100% -->
            <span
              v-if="progressPercent === 100"
              class="complete-sparkles"
              aria-hidden="true"
            >
              <span class="cs" style="--sx: -14px; --sy: -20px; --d: 0s"
                >&#10022;</span
              >
              <span class="cs" style="--sx: 12px; --sy: -24px; --d: 0.12s"
                >&#10038;</span
              >
              <span class="cs" style="--sx: -4px; --sy: -28px; --d: 0.25s"
                >&#10047;</span
              >
              <span class="cs" style="--sx: 8px; --sy: -16px; --d: 0.08s"
                >&#10022;</span
              >
              <span class="cs" style="--sx: -18px; --sy: -14px; --d: 0.18s"
                >&#10038;</span
              >
              <span class="cs" style="--sx: 16px; --sy: -12px; --d: 0.3s"
                >&#10047;</span
              >
            </span>
          </div>
          <span class="progress-label">
            {{ collectedCount }}<span class="progress-sep">/</span
            >{{ totalCount }}
          </span>
        </div>
        <p class="progress-text">
          <template v-if="collectedCount === totalCount && totalCount > 0">
            <span class="complete-text">&#10024; {{ t('hunt.progress_complete') }}</span>
          </template>
          <template v-else-if="collectedCount === 0">
            {{ t('hunt.progress_none') }}
          </template>
          <template v-else>
            {{ t('hunt.progress_remaining', { n: totalCount - collectedCount }, totalCount - collectedCount) }}
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
import { useI18n } from "vue-i18n";
import type { HuntYear } from "../utils/spotLoader";
import SpotCard from "./SpotCard.vue";

const { t } = useI18n();

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
  background: var(--bg-surface);
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
  height: 10px;
  border-radius: 5px;
  background: rgba(120, 90, 180, 0.15);
  position: relative;
  border: 1px solid rgba(155, 109, 255, 0.12);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
}

/* Rune-like milestone tick marks along the track */
.milestone-mark {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 2px;
  transform: translateX(-1px);
  background: rgba(155, 109, 255, 0.15);
  z-index: 1;
  transition: background 0.4s ease;
}
.milestone-mark.reached {
  background: rgba(212, 168, 67, 0.35);
}

.progress-bar-fill {
  height: 100%;
  border-radius: 5px;
  background: linear-gradient(
    90deg,
    #9b6dff 0%,
    var(--accent) 45%,
    #f0d078 100%
  );
  background-size: 200% 100%;
  animation: enchanted-flow 3s ease-in-out infinite;
  transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: visible;
  box-shadow:
    0 0 8px rgba(212, 168, 67, 0.3),
    0 0 20px rgba(155, 109, 255, 0.15);
}

.progress-bar-fill.complete {
  background: linear-gradient(
    90deg,
    #34d399 0%,
    #6ee7b7 40%,
    #34d399 70%,
    #a7f3d0 100%
  );
  background-size: 200% 100%;
  box-shadow:
    0 0 10px rgba(52, 211, 153, 0.4),
    0 0 25px rgba(52, 211, 153, 0.15);
}

@keyframes enchanted-flow {
  0%,
  100% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
}

/* Glowing orb riding the leading edge */
.bar-orb {
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    #f0d078 0%,
    var(--accent) 50%,
    transparent 70%
  );
  box-shadow:
    0 0 6px rgba(212, 168, 67, 0.8),
    0 0 14px rgba(212, 168, 67, 0.4),
    0 0 24px rgba(155, 109, 255, 0.2);
  animation: orb-pulse 2s ease-in-out infinite;
  z-index: 3;
}

@keyframes orb-pulse {
  0%,
  100% {
    transform: translateY(-50%) scale(1);
    box-shadow:
      0 0 6px rgba(212, 168, 67, 0.8),
      0 0 14px rgba(212, 168, 67, 0.4),
      0 0 24px rgba(155, 109, 255, 0.2);
  }
  50% {
    transform: translateY(-50%) scale(1.2);
    box-shadow:
      0 0 8px rgba(212, 168, 67, 1),
      0 0 20px rgba(212, 168, 67, 0.6),
      0 0 32px rgba(155, 109, 255, 0.3);
  }
}

/* Celebratory sparkles when bar hits 100% */
.complete-sparkles {
  position: absolute;
  right: 0;
  top: 50%;
  pointer-events: none;
  z-index: 3;
}

.cs {
  position: absolute;
  font-size: 0.6rem;
  color: var(--collected);
  animation: sparkle-float 1.4s ease-out forwards;
  animation-delay: var(--d, 0s);
  opacity: 0;
  filter: drop-shadow(0 0 4px rgba(52, 211, 153, 0.7));
}

.progress-shimmer {
  position: absolute;
  inset: 0;
  border-radius: 5px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.12) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 2.5s infinite;
  pointer-events: none;
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
  animation: golden-reveal 0.6s ease both;
}

.spots-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  padding-bottom: 1rem;
  border-radius: 20px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  box-shadow: var(--shadow);
}
</style>
