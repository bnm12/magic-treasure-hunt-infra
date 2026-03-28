<template>
  <article
    class="spot-card glass-card"
    :class="{ collected }"
    style="animation: reveal-up 0.4s ease backwards"
  >
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
        <span class="badge-rune" aria-hidden="true">&#10022;</span>
        <span class="badge-label">Collected</span>
        <!-- Sparkle particles -->
        <span class="badge-sparkles" aria-hidden="true">
          <span class="bs" style="--bx: -8px; --by: -10px; --bd: 0s"
            >&#10038;</span
          >
          <span class="bs" style="--bx: 10px; --by: -14px; --bd: 0.2s"
            >&#10047;</span
          >
          <span class="bs" style="--bx: 4px; --by: -8px; --bd: 0.35s"
            >&#10022;</span
          >
        </span>
      </span>
      <span v-else class="undiscovered-badge">Undiscovered</span>
      <span v-if="!collected" class="locked-badge" aria-hidden="true">
        <svg
          class="lock-chain chain-a"
          viewBox="0 0 120 16"
          preserveAspectRatio="none"
        >
          <g
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <ellipse cx="10" cy="8" rx="7" ry="4" transform="rotate(18 10 8)" />
            <ellipse
              cx="26"
              cy="8"
              rx="7"
              ry="4"
              transform="rotate(-18 26 8)"
            />
            <ellipse cx="42" cy="8" rx="7" ry="4" transform="rotate(18 42 8)" />
            <ellipse
              cx="58"
              cy="8"
              rx="7"
              ry="4"
              transform="rotate(-18 58 8)"
            />
            <ellipse cx="74" cy="8" rx="7" ry="4" transform="rotate(18 74 8)" />
            <ellipse
              cx="90"
              cy="8"
              rx="7"
              ry="4"
              transform="rotate(-18 90 8)"
            />
            <ellipse
              cx="106"
              cy="8"
              rx="7"
              ry="4"
              transform="rotate(18 106 8)"
            />
          </g>
        </svg>
        <svg
          class="lock-chain chain-b"
          viewBox="0 0 120 16"
          preserveAspectRatio="none"
        >
          <g
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <ellipse cx="10" cy="8" rx="7" ry="4" transform="rotate(18 10 8)" />
            <ellipse
              cx="26"
              cy="8"
              rx="7"
              ry="4"
              transform="rotate(-18 26 8)"
            />
            <ellipse cx="42" cy="8" rx="7" ry="4" transform="rotate(18 42 8)" />
            <ellipse
              cx="58"
              cy="8"
              rx="7"
              ry="4"
              transform="rotate(-18 58 8)"
            />
            <ellipse cx="74" cy="8" rx="7" ry="4" transform="rotate(18 74 8)" />
            <ellipse
              cx="90"
              cy="8"
              rx="7"
              ry="4"
              transform="rotate(-18 90 8)"
            />
            <ellipse
              cx="106"
              cy="8"
              rx="7"
              ry="4"
              transform="rotate(18 106 8)"
            />
          </g>
        </svg>
        <svg viewBox="0 0 24 24" class="ward-sigil">
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="currentColor"
            stroke-width="1"
            opacity="0.4"
          />
          <circle
            cx="12"
            cy="12"
            r="5"
            fill="none"
            stroke="currentColor"
            stroke-width="0.8"
            opacity="0.25"
          />
          <path
            d="M12 3 L12 7 M12 17 L12 21 M3 12 L7 12 M17 12 L21 12"
            stroke="currentColor"
            stroke-width="0.8"
            opacity="0.3"
          />
          <path
            d="M12 9 L13.5 11 L12 13 L10.5 11 Z"
            fill="currentColor"
            opacity="0.3"
          />
        </svg>
      </span>
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
  background: var(--bg-surface);
  position: relative;
  transition:
    box-shadow 0.3s ease,
    border-color 0.3s ease,
    transform 0.3s ease;
}

.spot-card.collected {
  border-color: rgba(212, 168, 67, 0.3);
  box-shadow:
    var(--shadow),
    0 0 20px rgba(212, 168, 67, 0.08),
    inset 0 0 30px rgba(212, 168, 67, 0.03);
}

.spot-card:not(.collected)::after {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(8, 8, 20, 0.42);
  pointer-events: none;
}

.spot-card:hover {
  transform: translateY(-2px);
  box-shadow:
    var(--shadow),
    0 0 30px rgba(155, 109, 255, 0.1);
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
  background: linear-gradient(
    135deg,
    rgba(52, 211, 153, 0.85),
    rgba(110, 231, 183, 0.85)
  );
  color: #fff;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 0.65rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  box-shadow:
    0 0 8px rgba(52, 211, 153, 0.4),
    0 0 20px rgba(52, 211, 153, 0.15);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  overflow: visible;
}

.undiscovered-badge {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent2-rgb), 0.28);
  background: rgba(11, 11, 26, 0.78);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  color: rgba(232, 220, 200, 0.88);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
  box-shadow:
    0 0 0 1px rgba(var(--accent2-rgb), 0.08),
    0 4px 12px rgba(0, 0, 0, 0.28);
}

.badge-rune {
  font-size: 0.7rem;
  filter: drop-shadow(0 0 3px rgba(255, 255, 255, 0.6));
  animation: badge-rune-spin 4s linear infinite;
}

@keyframes badge-rune-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.badge-label {
  line-height: 1;
}

/* Floating sparks off the badge */
.badge-sparkles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.bs {
  position: absolute;
  top: 50%;
  left: 50%;
  font-size: 0.4rem;
  color: rgba(255, 255, 255, 0.8);
  animation: badge-spark 2.4s ease-in-out infinite;
  animation-delay: var(--bd, 0s);
  opacity: 0;
}
@keyframes badge-spark {
  0%,
  100% {
    opacity: 0;
    transform: translate(0, 0) scale(0.5);
  }
  40% {
    opacity: 1;
    transform: translate(var(--bx), var(--by)) scale(1);
  }
  80% {
    opacity: 0;
    transform: translate(var(--bx), calc(var(--by) - 6px)) scale(0.3);
  }
}

.badge-icon {
  font-size: 0.7rem;
}

.locked-badge {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.lock-chain {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 150%;
  height: 1rem;
  transform-origin: center;
  color: var(--accent);
  opacity: 0.34;
  overflow: visible;
  filter:
    drop-shadow(0 0 1px rgba(var(--accent-rgb), 0.28))
    drop-shadow(0 0 3px rgba(var(--accent-rgb), 0.08))
    drop-shadow(0 1px 2px rgba(0, 0, 0, 0.24));
}

.chain-a {
  transform: translate(-50%, -50%) rotate(35deg);
}

.chain-b {
  transform: translate(-50%, -50%) rotate(-35deg);
}

.ward-sigil {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4.75rem;
  height: 4.75rem;
  transform: translate(-50%, -50%);
  color: var(--accent2);
  opacity: 0.95;
  z-index: 2;
  filter: drop-shadow(0 0 8px rgba(var(--accent2-rgb), 0.45));
  animation: ward-pulse 3s ease-in-out infinite;
}

@keyframes ward-pulse {
  0%,
  100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.08);
  }
}

.content {
  flex: 1;
  padding: 0.9rem 1rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.25rem;
  min-width: 0;
  position: relative;
  z-index: 1;
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

  .locked-badge {
    inset: 0;
  }

  .lock-chain {
    width: 165%;
    height: 1.1rem;
  }

  .ward-sigil {
    width: 5.15rem;
    height: 5.15rem;
  }
}
</style>
