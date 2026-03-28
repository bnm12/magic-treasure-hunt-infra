<template>
  <article class="spot-card glass-card" :class="{ collected }" style="animation: reveal-up 0.4s ease backwards">
    <div class="image-wrapper">
      <img
        :src="spot.image"
        :alt="spot.imageAlt"
        class="spot-image"
        loading="lazy"
      />
      <div class="image-overlay"></div>
      <span class="spot-number">#{{ spotId }}</span>
      <span v-if="collected" class="collected-badge">
        <span class="badge-icon" aria-hidden="true">&#10003;</span> Collected
      </span>
      <span v-else class="locked-badge" aria-hidden="true">&#128274;</span>
    </div>
    <div class="content">
      <h3 class="name">{{ spot.name }}</h3>
      <p v-if="collected && spot.location" class="location">
        <span class="loc-icon" aria-hidden="true">&#9673;</span>
        {{ spot.location }}
      </p>
      <p class="text" :class="collected ? 'collected-text' : 'hint-text'">
        {{ collected ? spot.collectedText : spot.hint }}
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { SpotDefinition } from "../utils/spotLoader";

defineProps<{
  spotId: string;
  spot: SpotDefinition;
  collected: boolean;
}>();
</script>

<style scoped>
.spot-card {
  display: flex;
  gap: 0;
  overflow: hidden;
  transition:
    box-shadow 0.3s ease,
    border-color 0.3s ease,
    opacity 0.3s ease,
    transform 0.3s ease;
  opacity: 0.5;
}

.spot-card.collected {
  border-color: rgba(212, 168, 67, 0.3);
  opacity: 1;
  box-shadow: var(--shadow), 0 0 20px rgba(212, 168, 67, 0.08);
}

.spot-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow), 0 0 30px rgba(155, 109, 255, 0.1);
}

.spot-card.collected:hover {
  box-shadow: var(--shadow), var(--glow-gold);
}

.image-wrapper {
  position: relative;
  flex: 0 0 110px;
  overflow: hidden;
  background: var(--code-bg);
}

.spot-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: grayscale(100%) brightness(0.6);
  transition: filter 0.4s ease;
}

.spot-card.collected .spot-image {
  filter: grayscale(0%) brightness(1);
}

.image-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent, rgba(11, 11, 26, 0.3));
  pointer-events: none;
}

.spot-number {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(11, 11, 26, 0.75);
  backdrop-filter: blur(4px);
  color: var(--accent);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: 700;
  font-family: var(--heading);
  letter-spacing: 0.5px;
}

.collected-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgba(52, 211, 153, 0.9);
  color: #fff;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  box-shadow: var(--glow-green);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-icon {
  font-size: 0.7rem;
}

.locked-badge {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.5rem;
  opacity: 0.3;
  filter: grayscale(100%);
}

.content {
  flex: 1;
  padding: 0.9rem 1rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.25rem;
  min-width: 0;
}

.name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-h);
  line-height: 1.3;
}

.spot-card.collected .name {
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.location {
  margin: 0;
  font-size: 0.75rem;
  color: var(--text);
  opacity: 0.7;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.loc-icon {
  font-size: 0.6rem;
  color: var(--accent);
}

.text {
  margin: 0;
  line-height: 1.5;
  font-size: 0.85rem;
}

.hint-text {
  color: var(--text);
  font-style: italic;
  opacity: 0.7;
}

.collected-text {
  color: var(--collected);
  font-weight: 500;
}

@media (max-width: 600px) {
  .spot-card {
    flex-direction: column;
  }

  .image-wrapper {
    flex: 0 0 auto;
    height: 160px;
    width: 100%;
  }

  .content {
    padding: 0.85rem;
  }
}
</style>
