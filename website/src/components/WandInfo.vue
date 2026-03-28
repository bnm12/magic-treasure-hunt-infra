<template>
  <div v-if="metadata" class="wand-info-card">
    <div class="wand-badge">
      <span class="wand-icon">✨</span>
      <span class="wand-label">Your Wand</span>
    </div>
    <div class="wand-details">
      <div class="owner-section">
        <p class="owner-label">Owner</p>
        <p class="owner-name">{{ metadata.name }}</p>
      </div>
      <div class="divider"></div>
      <div class="year-section">
        <p class="year-label">Activated</p>
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
  margin: 0 auto 2rem;
  max-width: 540px;
  padding: 1.5rem;
  background: linear-gradient(135deg, var(--accent-bg) 0%, rgba(170, 59, 255, 0.05) 100%);
  border: 1px solid var(--accent-border);
  border-radius: 12px;
  box-shadow: var(--shadow);
}

.wand-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.wand-icon {
  font-size: 20px;
  display: inline-block;
  animation: sparkle 2s ease-in-out infinite;
}

@keyframes sparkle {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
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

.owner-label,
.year-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 0.5rem;
}

.owner-name {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-h);
  margin: 0;
  word-break: break-word;
}

.year-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--accent);
  margin: 0;
}

.divider {
  width: 1px;
  height: 60px;
  background: var(--accent-border);
}

@media (max-width: 768px) {
  .wand-info-card {
    padding: 1.25rem;
    margin: 0 auto 1.5rem;
  }

  .wand-details {
    gap: 1rem;
  }

  .divider {
    height: 50px;
  }

  .owner-name,
  .year-value {
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .wand-info-card {
    padding: 1rem;
    margin: 0 auto 1rem;
  }

  .wand-details {
    flex-direction: column;
    gap: 1rem;
  }

  .divider {
    width: 100%;
    height: 1px;
  }

  .owner-name,
  .year-value {
    font-size: 18px;
  }
}
</style>
