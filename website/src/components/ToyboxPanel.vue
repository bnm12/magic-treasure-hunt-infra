<template>
  <section class="toybox-panel">
    <div class="section-title">
      <span class="icon" aria-hidden="true">&#9881;</span>
      <h2>Toybox</h2>
    </div>

    <!-- Wand Initialization Section -->
    <div class="toybox-section glass-card">
      <h3>
        <span class="section-icon" aria-hidden="true">&#10022;</span> Initialize
        Wand
      </h3>
      <p class="note">
        Initialize a blank NFC tag as an official wand. The wand can then
        collect treasures on your adventure.
      </p>

      <div class="form-group">
        <label for="wand-name">Owner name</label>
        <input
          v-model="wandName"
          id="wand-name"
          class="nfc-input"
          type="text"
          placeholder="e.g., Benjamin"
          maxlength="127"
        />
        <small>{{ wandName.length }}/127 characters</small>
      </div>

      <p v-if="wandInitError" class="validation-error" role="alert">
        {{ wandInitError }}
      </p>

      <div class="nfc-controls">
        <button
          :disabled="isWriting || wandName.length === 0"
          @click="handleInitWand"
          type="button"
          class="counter"
        >
          {{
            isWriting ? "&#10024; Initializing..." : "&#10022; Initialize Wand"
          }}
        </button>
      </div>
    </div>

    <hr class="divider-magic" />

    <!-- Record 1 Configuration Section -->
    <div class="toybox-section glass-card">
      <h3>
        <span class="section-icon" aria-hidden="true">&#9998;</span> Configure
        Record 1
      </h3>
      <p class="note">
        Configure record 1 for a normal NFC action. Treasure progress is always
        preserved when writing.
      </p>

      <div class="form-group">
        <label for="toy-action">Action type</label>
        <select v-model="toyAction" id="toy-action" class="nfc-input">
          <option value="url">Open URL</option>
          <option value="text">Show text</option>
        </select>
      </div>

      <div class="form-group">
        <label for="toy-payload">{{
          toyAction === "url" ? "URL" : "Text"
        }}</label>
        <input
          v-model="toyPayload"
          id="toy-payload"
          class="nfc-input"
          type="text"
          :placeholder="
            toyAction === 'url'
              ? 'https://example.org/magic'
              : 'Your magic message'
          "
        />
      </div>

      <p v-if="validationError" class="validation-error" role="alert">
        {{ validationError }}
      </p>

      <div class="nfc-controls">
        <button
          :disabled="isWriting"
          @click="handleWrite"
          type="button"
          class="counter"
        >
          {{ isWriting ? "&#10024; Writing..." : "&#9733; Write to Wand" }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  isWriting: boolean;
  initializeWand: (name: string, year: number) => Promise<void>;
}>();

const emit = defineEmits<{
  write: [payload: { action: string; payload: string }];
}>();

const wandName = ref("");
const wandInitError = ref("");
const toyAction = ref("url");
const toyPayload = ref("");
const validationError = ref("");

// Clear error when user changes input
watch([toyAction, toyPayload], () => {
  validationError.value = "";
});

watch(wandName, () => {
  wandInitError.value = "";
});

async function handleInitWand() {
  wandInitError.value = "";
  const name = wandName.value.trim();

  if (!name) {
    wandInitError.value = "Please enter the owner's name.";
    return;
  }

  if (name.length > 127) {
    wandInitError.value = "Owner name is too long (max 127 characters).";
    return;
  }

  try {
    await props.initializeWand(name, new Date().getFullYear());
    wandName.value = "";
  } catch (error) {
    wandInitError.value = `Error: ${(error as Error).message}`;
  }
}

function handleWrite() {
  validationError.value = "";
  const payload = toyPayload.value.trim();

  if (!payload) {
    validationError.value = "Please enter a value.";
    return;
  }

  if (toyAction.value === "url") {
    try {
      const parsed = new URL(payload);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        validationError.value = "URL must start with http:// or https://";
        return;
      }
    } catch {
      validationError.value = "Please enter a valid URL.";
      return;
    }
  }

  emit("write", { action: toyAction.value, payload });
}
</script>

<style scoped>
.toybox-panel {
  padding: 1.5rem;
}

.toybox-section {
  padding: 1.25rem;
  margin-bottom: 0;
}

.toybox-section h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  color: var(--text-h);
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.section-icon {
  font-size: 1rem;
  color: var(--accent);
}

.note {
  color: var(--text);
  font-size: 0.85rem;
  margin-bottom: 1.25rem;
  line-height: 1.5;
}

.warning {
  padding: 0.7rem 1rem;
  border-radius: 10px;
  border: 1px solid rgba(251, 191, 36, 0.3);
  background: rgba(251, 191, 36, 0.06);
  color: var(--warning);
  font-size: 0.85rem;
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.warning-icon {
  font-size: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-h);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-group small {
  font-size: 0.75rem;
  color: var(--text);
  opacity: 0.6;
  margin-top: 0.15rem;
}

.validation-error {
  color: var(--danger);
  font-size: 0.8rem;
  margin: -0.5rem 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}
</style>
