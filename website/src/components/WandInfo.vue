<template>
  <div v-if="metadata" class="wand-info-card glass-card">
    <div class="wand-badge">
      <span class="wand-icon" aria-hidden="true">&#10022;</span>
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
</template>

<script setup lang="ts">
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
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
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
  font-size: 1.2rem;
  display: inline-block;
  animation: sparkle-spin 4s linear infinite;
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
</style>
