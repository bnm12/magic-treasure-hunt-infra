<template>
  <section class="toybox-panel">
    <div v-if="showInstallAction" class="toybox-section glass-card">
      <h3>
        <span class="section-icon" aria-hidden="true">&#11015;</span> Install
        Companion
      </h3>
      <p class="note">
        Add the wand companion to your home screen as a standalone app when your
        browser supports installation.
      </p>

      <div class="nfc-controls">
        <button @click="emit('install')" type="button" class="counter">
          &#10022; Install App
        </button>
      </div>
    </div>

    <div v-if="showInstallAction" class="toybox-divider" aria-hidden="true">
      <span class="toybox-divider-core"></span>
    </div>

    <div class="toybox-section glass-card">
      <h3>
        <span class="section-icon" aria-hidden="true">&#9998;</span> Default Tap
        Action
      </h3>
      <p class="note">
        Choose what the wand does on a normal NFC tap. Treasure progress is
        always preserved when writing.
      </p>

      <div class="form-group">
        <label for="toy-action">Action type</label>
        <select v-model="toyAction" id="toy-action" class="nfc-input">
          <option
            v-for="action in toyboxActions"
            :key="action.id"
            :value="action.id"
          >
            {{ action.label }}
          </option>
        </select>
      </div>

      <p class="action-summary">
        {{ selectedActionDefinition?.description }}
      </p>

      <div
        v-for="field in selectedActionDefinition?.fields ?? []"
        :key="field.key"
        class="form-group"
      >
        <label :for="`toy-${field.key}`">
          {{ field.label }}
          <span v-if="field.optional" class="optional-mark">(optional)</span>
        </label>

        <textarea
          v-if="field.type === 'textarea'"
          :id="`toy-${field.key}`"
          v-model="toyFields[field.key]"
          class="nfc-input nfc-textarea"
          :placeholder="field.placeholder"
          rows="3"
        ></textarea>

        <input
          v-else
          :id="`toy-${field.key}`"
          v-model="toyFields[field.key]"
          class="nfc-input"
          :type="field.type ?? 'text'"
          :placeholder="field.placeholder"
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

    <div class="toybox-divider" aria-hidden="true">
      <span class="toybox-divider-core"></span>
    </div>

    <div class="admin-shell">
      <div class="admin-header">
        <p class="admin-kicker">Temporary</p>
        <h3>Admin Tools</h3>
        <p class="note">
          These controls are for setup, testing, and debugging. We plan to
          remove them from the public Toybox flow later.
        </p>
      </div>

      <div class="toybox-section glass-card">
        <h4>
          <span class="section-icon" aria-hidden="true">&#10022;</span>
          Initialize Wand
        </h4>
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

        <div class="form-group">
          <label for="wand-creation-year">Creation year</label>
          <select
            v-model.number="wandCreationYear"
            id="wand-creation-year"
            class="nfc-input"
          >
            <option v-for="year in availableYears" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
        </div>

        <p v-if="wandInitError" class="validation-error" role="alert">
          {{ wandInitError }}
        </p>

        <div class="nfc-controls">
          <button
            :disabled="
              isWriting || wandName.length === 0 || wandCreationYear === 0
            "
            @click="handleInitWand"
            type="button"
            class="counter"
          >
            {{
              isWriting
                ? "&#10024; Initializing..."
                : "&#10022; Initialize Wand"
            }}
          </button>
        </div>
      </div>

      <div class="toybox-section glass-card">
        <h4>
          <span class="section-icon" aria-hidden="true">&#10038;</span> Unlock
          Test Treasure
        </h4>
        <p class="note">
          Add any spot from any hunt year onto the wand for testing and debug
          flows.
        </p>

        <div class="form-group">
          <label for="debug-year">Hunt year</label>
          <select v-model.number="debugYear" id="debug-year" class="nfc-input">
            <option v-for="year in availableYears" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="debug-spot">Spot</label>
          <select
            v-model.number="debugSpotId"
            id="debug-spot"
            class="nfc-input"
          >
            <option
              v-for="spotId in availableSpotIds"
              :key="spotId"
              :value="spotId"
            >
              Spot {{ spotId }}
            </option>
          </select>
        </div>

        <p v-if="debugUnlockError" class="validation-error" role="alert">
          {{ debugUnlockError }}
        </p>

        <div class="nfc-controls">
          <button
            :disabled="isWriting || debugYear === 0 || debugSpotId === 0"
            @click="handleUnlockSpot"
            type="button"
            class="counter"
          >
            {{
              isWriting
                ? "&#10024; Unlocking..."
                : `&#9733; Unlock Spot ${debugSpotId || ""}`
            }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  buildToyRecord,
  createEmptyToyRecordFields,
  TOYBOX_ACTIONS,
  type ToyRecordAction,
  type ToyRecordWriteRequest,
} from "../utils/toyboxRecord1";

const props = defineProps<{
  isWriting: boolean;
  initializeWand: (name: string, year: number) => Promise<void>;
  unlockTestSpot: (year: number, spotId: number) => Promise<void>;
  showInstallAction: boolean;
  activeHuntYear: number;
  availableYears: number[];
  availableSpotIdsByYear: Record<number, number[]>;
}>();

const emit = defineEmits<{
  write: [payload: ToyRecordWriteRequest];
  install: [];
}>();

const wandName = ref("");
const wandInitError = ref("");
const toyboxActions = TOYBOX_ACTIONS;
const toyAction = ref<ToyRecordAction>("url");
const toyFields = ref<Record<string, string>>(
  createEmptyToyRecordFields("url"),
);
const validationError = ref("");
const wandCreationYear = ref(0);
const debugYear = ref(0);
const debugSpotId = ref(0);
const debugUnlockError = ref("");

const selectedActionDefinition = computed(() =>
  toyboxActions.find((action) => action.id === toyAction.value),
);

const availableSpotIds = computed(
  () => props.availableSpotIdsByYear[debugYear.value] ?? [],
);

watch(toyAction, (action) => {
  toyFields.value = createEmptyToyRecordFields(action);
  validationError.value = "";
});

watch(wandName, () => {
  wandInitError.value = "";
});

watch(
  toyFields,
  () => {
    validationError.value = "";
  },
  { deep: true },
);

watch(
  [() => props.activeHuntYear, () => props.availableYears],
  ([activeHuntYear, availableYears]) => {
    const preferredYear =
      activeHuntYear && availableYears.includes(activeHuntYear)
        ? activeHuntYear
        : (availableYears[0] ?? 0);

    if (preferredYear > 0 && !availableYears.includes(wandCreationYear.value)) {
      wandCreationYear.value = preferredYear;
    }
  },
  { immediate: true },
);

watch(
  () => props.availableYears,
  (years) => {
    if (years.length > 0 && !years.includes(debugYear.value)) {
      debugYear.value = years[0];
    }
  },
  { immediate: true },
);

watch(
  availableSpotIds,
  (spotIds) => {
    if (spotIds.length === 0) {
      debugSpotId.value = 0;
      return;
    }

    if (!spotIds.includes(debugSpotId.value)) {
      debugSpotId.value = spotIds[0];
    }
  },
  { immediate: true },
);

watch([debugYear, debugSpotId], () => {
  debugUnlockError.value = "";
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

  if (wandCreationYear.value === 0) {
    wandInitError.value = "Please choose a creation year.";
    return;
  }

  try {
    await props.initializeWand(name, wandCreationYear.value);
    wandName.value = "";
  } catch (error) {
    wandInitError.value = `Error: ${(error as Error).message}`;
  }
}

function handleWrite() {
  validationError.value = "";
  const request: ToyRecordWriteRequest = {
    action: toyAction.value,
    fields: { ...toyFields.value },
  };

  try {
    buildToyRecord(request);
  } catch (error) {
    validationError.value = (error as Error).message;
    return;
  }

  emit("write", request);
}

async function handleUnlockSpot() {
  debugUnlockError.value = "";

  if (debugYear.value === 0 || debugSpotId.value === 0) {
    debugUnlockError.value = "Choose a hunt year and a spot first.";
    return;
  }

  try {
    await props.unlockTestSpot(debugYear.value, debugSpotId.value);
  } catch (error) {
    debugUnlockError.value = `Error: ${(error as Error).message}`;
  }
}
</script>

<style scoped>
.toybox-panel {
  padding: 0 1.5rem 1.5rem;
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

.toybox-section h4 {
  margin: 0 0 0.5rem;
  font-size: 0.95rem;
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

.action-summary {
  margin: -0.5rem 0 1rem;
  font-size: 0.82rem;
  color: var(--text);
  opacity: 0.85;
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

.optional-mark {
  color: var(--text);
  opacity: 0.7;
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0;
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

.nfc-textarea {
  min-height: 5.25rem;
  resize: vertical;
}

.nfc-controls {
  width: 100%;
  justify-content: center;
}

.nfc-controls .counter {
  width: 100%;
  justify-content: center;
  text-align: center;
}

.toybox-divider {
  display: block;
  position: relative;
  height: 16px;
  margin: 1.5rem 0;
}

.toybox-divider::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 2px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(212, 168, 67, 0.18) 14%,
    rgba(212, 168, 67, 0.58) 34%,
    rgba(244, 217, 122, 0.96) 50%,
    rgba(212, 168, 67, 0.58) 66%,
    rgba(212, 168, 67, 0.18) 86%,
    transparent
  );
  box-shadow:
    0 0 12px rgba(212, 168, 67, 0.16),
    0 0 24px rgba(212, 168, 67, 0.08);
}

.toybox-divider-core {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  transform: translate(-50%, -50%);
  border-radius: 999px;
  background: radial-gradient(
    circle,
    rgba(244, 217, 122, 1) 0%,
    rgba(212, 168, 67, 0.95) 48%,
    rgba(212, 168, 67, 0) 100%
  );
  box-shadow:
    0 0 14px rgba(244, 217, 122, 0.45),
    0 0 28px rgba(212, 168, 67, 0.2);
}

.admin-shell {
  display: grid;
  gap: 1rem;
  margin-top: 0.35rem;
}

.admin-header {
  position: relative;
  padding: 0.95rem 1rem;
  border: 1px solid rgba(212, 168, 67, 0.24);
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(212, 168, 67, 0.1), rgba(212, 168, 67, 0.03)),
    rgba(16, 16, 36, 0.78);
  box-shadow:
    inset 0 0 0 1px rgba(240, 208, 120, 0.05),
    0 8px 24px rgba(0, 0, 0, 0.18);
}

.admin-shell .toybox-section {
  margin-top: 0;
}

.admin-kicker {
  margin-bottom: 0.25rem;
  color: var(--accent);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.admin-header h3 {
  margin: 0 0 0.35rem;
  color: var(--text-h);
}

.admin-header .note {
  margin-bottom: 0;
  color: var(--text);
  opacity: 0.92;
}
</style>
