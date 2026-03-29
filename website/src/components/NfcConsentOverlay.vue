<template>
  <div v-if="visible" class="nfc-consent-overlay">
    <div class="nfc-consent-card">
      <span class="consent-wand" aria-hidden="true">&#10024;</span>
      <h2 class="consent-title">{{ t('consent.title') }}</h2>
      <p class="consent-desc">{{ t('consent.desc') }}</p>
      <button class="consent-btn" @click="emit('consent')">
        {{ t('consent.enable') }}
      </button>
      <button class="consent-skip" @click="emit('skip')">
        {{ t('consent.skip') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
const { t } = useI18n();

defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  consent: [];
  skip: [];
}>();
</script>

<style scoped>
.nfc-consent-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 5, 15, 0.85);
  backdrop-filter: blur(12px);
  padding: 1.5rem;
}

.nfc-consent-card {
  max-width: 340px;
  width: 100%;
  text-align: center;
  padding: 2.5rem 2rem 2rem;
  border-radius: 20px;
  background: var(--surface);
  border: 1px solid var(--accent-border);
  box-shadow:
    var(--glow-gold),
    0 16px 48px rgba(0, 0, 0, 0.6);
  animation: reveal-up 0.4s ease;
}

.consent-wand {
  font-size: 3.5rem;
  display: block;
  margin-bottom: 0.75rem;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 0 16px rgba(212, 168, 67, 0.5));
}

.consent-title {
  font-size: 1.3rem;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 0.75rem;
  line-height: 1.3;
}

.consent-desc {
  color: var(--text);
  font-size: 0.85rem;
  line-height: 1.6;
  margin: 0 0 1.5rem;
}

.consent-btn {
  width: 100%;
  padding: 0.85rem 1.5rem;
  border: none;
  border-radius: 12px;
  background: var(--gradient-gold);
  color: var(--bg);
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  box-shadow: 0 4px 20px rgba(212, 168, 67, 0.3);
}

.consent-btn:active {
  transform: scale(0.97);
}

.consent-skip {
  display: block;
  margin-top: 0.75rem;
  background: none;
  border: none;
  color: var(--text);
  font-size: 0.75rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.consent-skip:hover {
  opacity: 1;
}
</style>
