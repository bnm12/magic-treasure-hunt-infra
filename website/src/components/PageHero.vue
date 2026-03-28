<template>
  <header class="page-hero" :class="{ compact }">
    <component :is="icon" class="page-hero__icon" :class="{ still: noSpin }" aria-hidden="true" />
    <p class="page-hero__eyebrow">{{ eyebrow }}</p>
    <h1 class="page-hero__title">{{ title }}</h1>
    <p v-if="copy" class="page-hero__copy">{{ copy }}</p>
    <div v-if="showIndicator" class="page-hero__indicator" :class="{ active: indicatorActive }">
      <span class="page-hero__dot"></span>
      <span class="page-hero__indicator-label">{{ indicatorLabel }}</span>
    </div>
  </header>
</template>

<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
  icon: Component;
  eyebrow: string;
  title: string;
  copy?: string;
  compact?: boolean;
  noSpin?: boolean;
  showIndicator?: boolean;
  indicatorActive?: boolean;
  indicatorLabel?: string;
}>();
</script>

<style scoped>
.page-hero {
  text-align: center;
  padding: 1.5rem 1rem 1.1rem;
  position: relative;
}

.page-hero.compact {
  padding-top: 1.2rem;
  padding-bottom: 0.9rem;
}

.page-hero__icon {
  font-size: 1.75rem;
  color: var(--accent);
  display: block;
  margin: 0 auto 0.35rem;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 0 10px rgba(212, 168, 67, 0.45));
}

.page-hero__icon.still {
  animation: float 3s ease-in-out infinite;
}

.page-hero__eyebrow {
  text-transform: uppercase;
  letter-spacing: 2px;
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--accent2);
  margin-bottom: 0.2rem;
}

.page-hero__title {
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 1.45rem;
  margin: 0.15rem 0 0.45rem;
  line-height: 1.15;
}

.page-hero__copy {
  color: var(--text);
  font-size: 0.84rem;
  line-height: 1.5;
  max-width: 40ch;
  margin: 0 auto;
}

.page-hero__indicator {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.8rem;
  padding: 0.28rem 0.7rem;
  border-radius: 20px;
  background: rgba(120, 90, 180, 0.1);
  border: 1px solid var(--border);
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text);
  transition: all 0.5s ease;
}

.page-hero__indicator.active {
  border-color: var(--accent-border);
  color: var(--accent);
  background: var(--accent-bg);
}

.page-hero__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text);
  transition:
    background 0.5s ease,
    box-shadow 0.5s ease;
}

.page-hero__indicator.active .page-hero__dot {
  background: var(--accent);
  box-shadow: 0 0 6px rgba(212, 168, 67, 0.6);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

@media (max-width: 600px) {
  .page-hero {
    padding: 1.2rem 0.9rem 0.85rem;
  }

  .page-hero__icon {
    font-size: 1.55rem;
    margin-bottom: 0.25rem;
  }

  .page-hero__title {
    font-size: 1.28rem;
    margin-bottom: 0.35rem;
  }

  .page-hero__copy {
    font-size: 0.8rem;
    line-height: 1.45;
  }

  .page-hero__indicator {
    margin-top: 0.65rem;
  }
}
</style>
