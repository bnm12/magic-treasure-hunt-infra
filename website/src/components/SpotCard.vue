<template>
  <article class="spot-card" :class="{ collected }">
    <div class="image-wrapper">
      <img
        :src="spot.image"
        :alt="spot.imageAlt"
        class="spot-image"
        loading="lazy"
      />
      <span v-if="collected" class="collected-badge">✓ Collected</span>
    </div>
    <div class="content">
      <h3 class="name">{{ spot.name }}</h3>
      <p v-if="spot.location" class="location">{{ spot.location }}</p>
      <p class="text" :class="collected ? 'collected-text' : 'hint-text'">
        {{ collected ? spot.collectedText : spot.hint }}
      </p>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { SpotDefinition } from "../utils/spotLoader";

defineProps<{
  spot: SpotDefinition;
  collected: boolean;
}>();
</script>

<style scoped>
.spot-card {
  display: flex;
  gap: 0;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--shadow);
  background: var(--bg);
  border: 1px solid var(--border);
  transition:
    box-shadow 0.2s ease,
    border-color 0.2s ease,
    opacity 0.2s ease;
  opacity: 0.55;
}

.spot-card.collected {
  border-color: var(--accent-border);
  background: var(--accent-bg);
  opacity: 1;
}

.spot-card:hover {
  box-shadow:
    rgba(0, 0, 0, 0.15) 0 20px 25px -5px,
    rgba(0, 0, 0, 0.08) 0 8px 10px -4px;
}

.image-wrapper {
  position: relative;
  flex: 0 0 160px;
  overflow: hidden;
  background: var(--code-bg);
}

.spot-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: grayscale(100%);
  transition: filter 0.2s ease;
}

.spot-card.collected .spot-image {
  filter: grayscale(0%);
}

.collected-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #22c55e;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  box-shadow: var(--shadow);
}

.content {
  flex: 1;
  padding: 1.25rem 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.4rem;
}

.name {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-h);
}

.location {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text);
  opacity: 0.7;
}

.text {
  margin: 0.25rem 0 0;
  line-height: 1.55;
  font-size: 0.95rem;
}

.hint-text {
  color: var(--text);
  font-style: italic;
}

.collected-text {
  color: #22c55e;
  font-weight: 500;
}

@media (prefers-color-scheme: dark) {
  .collected-badge {
    background: #16a34a;
  }

  .collected-text {
    color: #86efac;
  }
}

@media (max-width: 600px) {
  .spot-card {
    flex-direction: column;
  }

  .image-wrapper {
    flex: 0 0 auto;
    height: 180px;
    width: 100%;
  }

  .content {
    padding: 1rem;
  }
}
</style>
