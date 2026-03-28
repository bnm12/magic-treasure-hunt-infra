<template>
  <div class="initialize-page page">
    <PageHero
      :icon="IconWandTweaker"
      eyebrow="Mass Initialization"
      title="Wand Workshop"
      :copy="`Initializing wands for the ${year} hunt.`"
      :compact="true"
    />

    <div class="initialize-content glass-card">
      <div class="form-group">
        <label for="wand-name">Owner name</label>
        <input
          v-model="wandName"
          id="wand-name"
          ref="nameInput"
          class="nfc-input"
          type="text"
          placeholder="e.g., Benjamin"
          maxlength="127"
          @keyup.enter="handleInitWand"
        />
        <div class="input-footer">
          <small>{{ wandName.length }}/127 characters</small>
          <button @click="clearName" class="clear-btn" v-if="wandName">Clear</button>
        </div>
      </div>

      <p v-if="error" class="validation-error" role="alert">
        {{ error }}
      </p>

      <div class="nfc-controls">
        <button
          :disabled="isWriting || !wandName.trim()"
          @click="handleInitWand"
          type="button"
          class="counter primary-btn"
        >
          {{
            isWriting
              ? "✨ Initializing..."
              : "🪄 Initialize Wand"
          }}
        </button>
      </div>

      <div v-if="lastInitialized" class="success-message">
        <span class="sparkle">✨</span>
        Successfully initialized wand for <strong>{{ lastInitialized }}</strong>!
      </div>
    </div>

    <div class="history-section" v-if="history.length > 0">
      <h3>Recent Initializations</h3>
      <ul class="history-list">
        <li v-for="(name, index) in history" :key="index" class="history-item">
          <span class="history-name">{{ name }}</span>
          <span class="history-check">✓</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import PageHero from "./PageHero.vue";
import IconWandTweaker from "./icons/IconWandTweaker.vue";

const props = defineProps<{
  year: number;
  isWriting: boolean;
  initializeWand: (name: string, year: number) => Promise<void>;
}>();

const wandName = ref("");
const error = ref("");
const lastInitialized = ref("");
const history = ref<string[]>([]);
const nameInput = ref<HTMLInputElement | null>(null);

function clearName() {
  wandName.value = "";
  nameInput.value?.focus();
}

async function handleInitWand() {
  if (props.isWriting) return;
  error.value = "";
  const name = wandName.value.trim();

  if (!name) {
    error.value = "Please enter the owner's name.";
    return;
  }

  try {
    await props.initializeWand(name, props.year);
    lastInitialized.value = name;
    history.value.unshift(name);
    if (history.value.length > 5) {
      history.value.pop();
    }
    wandName.value = "";
    nameInput.value?.focus();
  } catch (e) {
    error.value = `Error: ${(e as Error).message}`;
  }
}

onMounted(() => {
  nameInput.value?.focus();
});
</script>

<style scoped>
.initialize-page {
  padding: 0 1.5rem 2rem;
  max-width: 500px;
  margin: 0 auto;
}

.initialize-content {
  padding: 2rem;
  margin-top: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-h);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.input-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0.25rem;
}

.input-footer small {
  font-size: 0.75rem;
  color: var(--text);
  opacity: 0.6;
}

.clear-btn {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 0.75rem;
  cursor: pointer;
  padding: 2px 5px;
  opacity: 0.8;
}

.clear-btn:hover {
  opacity: 1;
  text-decoration: underline;
}

.validation-error {
  color: var(--danger);
  font-size: 0.85rem;
  margin-bottom: 1rem;
  text-align: center;
}

.nfc-controls {
  margin-top: 1rem;
}

.primary-btn {
  width: 100%;
  justify-content: center;
  font-size: 1.1rem;
  padding: 1rem;
}

.success-message {
  margin-top: 1.5rem;
  padding: 1rem;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.2);
  border-radius: 12px;
  color: #4ade80;
  text-align: center;
  font-size: 0.9rem;
  animation: reveal-up 0.3s ease;
}

@keyframes reveal-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.sparkle {
  margin-right: 0.5rem;
}

.history-section {
  margin-top: 3rem;
}

.history-section h3 {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text);
  opacity: 0.6;
  margin-bottom: 1rem;
  text-align: center;
}

.history-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--text);
}

.history-check {
  color: #4ade80;
  font-weight: bold;
}
</style>
