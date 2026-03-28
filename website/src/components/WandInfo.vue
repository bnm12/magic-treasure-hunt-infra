<template>
  <Transition name="wand-appear">
    <div v-if="metadata" class="wand-info-card glass-card">
      <div class="sparkle-cascade" aria-hidden="true">
        <span class="sp" style="--sx: -30px; --sy: -45px; --d: 0s"
          >&#10022;</span
        >
        <span class="sp" style="--sx: 35px; --sy: -40px; --d: 0.12s"
          >&#10038;</span
        >
        <span class="sp" style="--sx: -20px; --sy: -55px; --d: 0.25s"
          >&#10047;</span
        >
        <span class="sp" style="--sx: 25px; --sy: -50px; --d: 0.08s"
          >&#10022;</span
        >
        <span class="sp" style="--sx: -40px; --sy: -35px; --d: 0.2s"
          >&#10038;</span
        >
        <span class="sp" style="--sx: 40px; --sy: -48px; --d: 0.16s"
          >&#10047;</span
        >
      </div>
      <div class="wand-badge">
        <IconWand class="wand-icon" aria-hidden="true" />
        <span class="wand-label">Your Wand</span>
      </div>
      <div class="wand-details">
        <div class="owner-section">
          <p class="detail-label">Owner</p>
          <p class="owner-name">{{ metadata.name }}</p>
        </div>
        <div class="divider"></div>
        <div class="year-section">
          <p class="detail-label">Activated</p>
          <p class="year-value">{{ metadata.creationYear }}</p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { Transition } from "vue";
import IconWand from "./icons/IconWand.vue";

interface Props {
  metadata: {
    name: string;
    creationYear: number;
  } | null;
}

defineProps<Props>();
</script>

<style scoped>
.wand-info-card {
  margin: 1rem;
  padding: 1.25rem;
  border-color: var(--accent-border);
  position: relative;
  overflow: hidden;
  animation: reveal-up 0.4s ease;
}

/* Magical gradient border glow */
.wand-info-card::before {
  content: "";
  position: absolute;
  inset: -1px;
  border-radius: 16px;
  padding: 1px;
  background: linear-gradient(
    135deg,
    rgba(212, 168, 67, 0.4),
    rgba(155, 109, 255, 0.2),
    rgba(212, 168, 67, 0.1)
  );
  mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  pointer-events: none;
  animation: border-glow 3s ease-in-out infinite;
}

.wand-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 1.5px;
}

.wand-icon {
  font-size: 1.4rem;
  display: inline-block;
  color: var(--accent);
  filter: drop-shadow(0 0 8px rgba(212, 168, 67, 0.5));
}

.wand-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
}

.owner-section,
.year-section {
  flex: 1;
}

.detail-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 0.4rem;
}

.owner-name {
  font-family: var(--heading);
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--text-h);
  margin: 0;
  word-break: break-word;
  animation: golden-reveal 0.8s ease 0.2s both;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.year-value {
  font-family: var(--heading);
  font-size: 1.35rem;
  font-weight: 600;
  margin: 0;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.divider {
  width: 1px;
  height: 50px;
  background: linear-gradient(
    to bottom,
    transparent,
    var(--accent-border),
    transparent
  );
}

@media (max-width: 480px) {
  .wand-info-card {
    padding: 1rem;
  }

  .wand-details {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .divider {
    width: 60%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--accent-border),
      transparent
    );
  }

  .owner-name,
  .year-value {
    font-size: 1.15rem;
  }
}

/* Sparkle cascade particles */
.sparkle-cascade {
  position: absolute;
  top: 50%;
  left: 50%;
  pointer-events: none;
  z-index: 1;
}

.sp {
  position: absolute;
  font-size: 0.8rem;
  color: var(--accent);
  animation: sparkle-float 1s ease-out forwards;
  animation-delay: var(--d, 0s);
  opacity: 0;
  filter: drop-shadow(0 0 4px rgba(212, 168, 67, 0.6));
}

/* Entrance transition */
.wand-appear-enter-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.wand-appear-leave-active {
  transition: all 0.3s ease;
}

.wand-appear-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(15px);
}

.wand-appear-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-8px);
}
</style>
