<template>
  <section class="toybox-panel">
    <h2>Toybox</h2>

    <!-- Wand Initialization Section -->
    <div class="toybox-section">
      <h3>Initialize Wand</h3>
      <p class="note">
        Initialize a blank NFC tag as an official wand. The wand can then
        collect treasures using an x-hunt-meta identity record.
      </p>

      <div class="form-group">
        <label for="wand-name">Wand name</label>
        <input
          v-model="wandName"
          id="wand-name"
          class="nfc-input"
          type="text"
          placeholder="e.g., Wand 1"
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
          {{ isWriting ? "Initializing..." : "Initialize Wand" }}
        </button>
      </div>
    </div>

    <hr class="section-divider" />

    <!-- Record 1 Configuration Section -->
    <div class="toybox-section">
      <h3>Configure Record 1</h3>
      <p class="note">
        Configure record 1 for a normal NFC action. Hunt and x-hunt-meta records are always
        preserved when writing.
      </p>

      <div v-if="!hasScannedWand" class="warning">
        Scan a wand first so hunt and x-hunt-meta records can be read and preserved during the
        write.
      </div>

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
          {{ isWriting ? "Writing..." : "Write to Wand" }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  hasScannedWand: boolean;
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
    wandInitError.value = "Please enter a wand name.";
    return;
  }

  if (name.length > 127) {
    wandInitError.value = "Wand name is too long (max 127 characters).";
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
  padding: 2rem;
  border-top: 1px solid var(--border);
}

.toybox-panel h2 {
  margin: 0 0 0.5rem;
}

.note {
  color: var(--text);
  font-size: 0.95rem;
  margin-bottom: 1.5rem;
}

.warning {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  border: 1px solid #f59e0b;
  background: rgba(245, 158, 11, 0.08);
  color: #92400e;
  font-size: 0.9rem;
  margin-bottom: 1.25rem;
}

@media (prefers-color-scheme: dark) {
  .warning {
    color: #fbbf24;
    border-color: #f59e0b;
    background: rgba(245, 158, 11, 0.12);
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-h);
}

.validation-error {
  color: #dc2626;
  font-size: 0.875rem;
  margin: -0.5rem 0 0.75rem;
}

@media (prefers-color-scheme: dark) {
  .validation-error {
    color: #f87171;
  }
}

.toybox-section {
  margin-bottom: 1.5rem;
}

.toybox-section h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  color: var(--text-h);
}

.toybox-section small {
  font-size: 0.8rem;
  color: var(--text);
  opacity: 0.75;
  display: block;
  margin-top: 0.25rem;
}

.section-divider {
  border: none;
  border-top: 1px solid var(--border);
  margin: 1.5rem 0;
}

@media (max-width: 1024px) {
  .toybox-panel {
    padding: 1.5rem 1.25rem;
  }
}
</style>
