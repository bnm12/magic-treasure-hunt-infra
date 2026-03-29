<template>
  <section class="toybox-panel">
    <div class="toybox-section glass-card language-section">
      <h3>
        <span class="section-icon" aria-hidden="true">&#127760;</span>
        {{ t('language.label') }}
      </h3>
      <div class="language-buttons">
        <button
          v-for="locale in supportedLocales"
          :key="locale"
          class="lang-btn"
          :class="{ active: currentLocale() === locale }"
          type="button"
          @click="setLocale(locale as SupportedLocale)"
        >
          {{ t(`language.${locale}`) }}
        </button>
      </div>
    </div>

    <div class="toybox-divider" aria-hidden="true">
      <span class="toybox-divider-core"></span>
    </div>

    <div v-if="showInstallAction" class="toybox-section glass-card">
      <h3>
        <span class="section-icon" aria-hidden="true">&#11015;</span>
        {{ t('toybox.install_title') }}
      </h3>
      <p class="note">{{ t('toybox.install_note') }}</p>

      <div class="nfc-controls">
        <button @click="emit('install')" type="button" class="counter">
          &#10022; {{ t('toybox.install_btn') }}
        </button>
      </div>
    </div>

    <div v-if="showInstallAction" class="toybox-divider" aria-hidden="true">
      <span class="toybox-divider-core"></span>
    </div>

    <div class="toybox-section glass-card">
      <h3>
        <span class="section-icon" aria-hidden="true">&#9998;</span>
        {{ t('toybox.action_title') }}
      </h3>
      <p class="note">{{ t('toybox.action_note') }}</p>

      <div class="form-group">
        <label for="toy-action">{{ t('toybox.action_label') }}</label>
        <select v-model="toyAction" id="toy-action" class="nfc-input">
          <option
            v-for="action in toyboxActions"
            :key="action.id"
            :value="action.id"
          >
            {{ t(`toybox.actions.${action.id}.label`) }}
          </option>
        </select>
      </div>

      <p class="action-summary">
        {{ t(`toybox.actions.${toyAction}.description`) }}
      </p>

      <div
        v-for="field in selectedActionDefinition?.fields ?? []"
        :key="field.key"
        class="form-group"
      >
        <label :for="`toy-${field.key}`">
          {{ t(`toybox.actions.${toyAction}.fields.${field.key}.label`) }}
          <span v-if="field.optional" class="optional-mark">{{ t('toybox.optional') }}</span>
        </label>

        <textarea
          v-if="field.type === 'textarea'"
          :id="`toy-${field.key}`"
          v-model="toyFields[field.key]"
          class="nfc-input nfc-textarea"
          :placeholder="t(`toybox.actions.${toyAction}.fields.${field.key}.placeholder`)"
          rows="3"
        ></textarea>

        <input
          v-else
          :id="`toy-${field.key}`"
          v-model="toyFields[field.key]"
          class="nfc-input"
          :type="field.type ?? 'text'"
          :placeholder="t(`toybox.actions.${toyAction}.fields.${field.key}.placeholder`)"
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
          {{ isWriting ? t('toybox.writing_btn') : t('toybox.write_btn') }}
        </button>
      </div>
    </div>

    <div class="toybox-divider" aria-hidden="true">
      <span class="toybox-divider-core"></span>
    </div>

    <div class="admin-shell">
      <div class="admin-header">
        <p class="admin-kicker">{{ t('toybox.admin_kicker') }}</p>
        <h3>{{ t('toybox.admin_title') }}</h3>
        <p class="note">{{ t('toybox.admin_note') }}</p>
      </div>

      <div class="toybox-section glass-card">
        <h4>
          <span class="section-icon" aria-hidden="true">&#10022;</span>
          {{ t('toybox.init_title') }}
        </h4>
        <p class="note">{{ t('toybox.init_note') }}</p>

        <div class="form-group">
          <label for="wand-name">{{ t('toybox.init_owner_label') }}</label>
          <input
            v-model="wandName"
            id="wand-name"
            class="nfc-input"
            type="text"
            :placeholder="t('toybox.init_owner_placeholder')"
            maxlength="127"
          />
          <small>{{ t('toybox.init_owner_counter', { count: wandName.length }) }}</small>
        </div>

        <div class="form-group">
          <label for="wand-creation-year">{{ t('toybox.init_year_label') }}</label>
          <select
            :value="wandCreationYear"
            @change="wandCreationYearOverride = +($event.target as HTMLSelectElement).value"
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
                ? t('toybox.init_btn_busy')
                : t('toybox.init_btn')
            }}
          </button>
        </div>
      </div>

      <div class="toybox-section glass-card">
        <h4>
          <span class="section-icon" aria-hidden="true">&#10038;</span>
          {{ t('toybox.unlock_title') }}
        </h4>
        <p class="note">{{ t('toybox.unlock_note') }}</p>

        <div class="form-group">
          <label for="debug-year">{{ t('toybox.unlock_year_label') }}</label>
          <select
            :value="debugYear"
            @change="debugYearOverride = +($event.target as HTMLSelectElement).value"
            id="debug-year"
            class="nfc-input"
          >
            <option v-for="year in availableYears" :key="year" :value="year">
              {{ year }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label for="debug-spot">{{ t('toybox.unlock_spot_label') }}</label>
          <select
            :value="debugSpotId"
            @change="debugSpotIdOverride = +($event.target as HTMLSelectElement).value"
            id="debug-spot"
            class="nfc-input"
          >
            <option
              v-for="spotId in availableSpotIds"
              :key="spotId"
              :value="spotId"
            >
              {{ t('toybox.unlock_spot_option', { id: spotId }) }}
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
                ? t('toybox.unlock_btn_busy')
                : t('toybox.unlock_btn', { id: debugSpotId || '' })
            }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useLocale } from "../composables/useLocale";
import type { SupportedLocale } from "../composables/useLocale";
import {
  buildToyRecord,
  createEmptyToyRecordFields,
  TOYBOX_ACTIONS,
  type ToyRecordAction,
  type ToyRecordWriteRequest,
} from "../utils/toyboxRecord1";

const { t } = useI18n();
const { setLocale, currentLocale, supportedLocales } = useLocale();

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
const debugUnlockError = ref("");

const selectedActionDefinition = computed(() =>
  toyboxActions.find((action) => action.id === toyAction.value),
);

// The year the user has explicitly selected for wand initialization (0 = no explicit choice)
const wandCreationYearOverride = ref<number>(0);

// Effective wand creation year: user's choice if valid, else prefer activeHuntYear, else first available
const wandCreationYear = computed<number>(() => {
  if (
    wandCreationYearOverride.value > 0 &&
    props.availableYears.includes(wandCreationYearOverride.value)
  ) {
    return wandCreationYearOverride.value;
  }
  if (
    props.activeHuntYear > 0 &&
    props.availableYears.includes(props.activeHuntYear)
  ) {
    return props.activeHuntYear;
  }
  return props.availableYears[0] ?? 0;
});

// The year the user has explicitly selected for debug unlock (0 = no explicit choice)
const debugYearOverride = ref<number>(0);

// Effective debug year: user's choice if valid, else first available
const debugYear = computed<number>(() => {
  if (
    debugYearOverride.value > 0 &&
    props.availableYears.includes(debugYearOverride.value)
  ) {
    return debugYearOverride.value;
  }
  return props.availableYears[0] ?? 0;
});

// All spot IDs available for the currently selected debug year
const availableSpotIds = computed<number[]>(
  () => props.availableSpotIdsByYear[debugYear.value] ?? [],
);

// The spot ID the user has explicitly selected for debug unlock (0 = no explicit choice)
const debugSpotIdOverride = ref<number>(0);

// Effective debug spot ID: user's choice if valid, else first available
const debugSpotId = computed<number>(() => {
  if (
    debugSpotIdOverride.value > 0 &&
    availableSpotIds.value.includes(debugSpotIdOverride.value)
  ) {
    return debugSpotIdOverride.value;
  }
  return availableSpotIds.value[0] ?? 0;
});

watch(toyAction, (action) => {
  toyFields.value = createEmptyToyRecordFields(action);
  validationError.value = "";
});

async function handleInitWand() {
  wandInitError.value = "";
  const name = wandName.value.trim();

  if (!name) {
    wandInitError.value = t("toybox.init_error_name_required");
    return;
  }

  if (name.length > 127) {
    wandInitError.value = t("toybox.init_error_name_too_long");
    return;
  }

  if (wandCreationYear.value === 0) {
    wandInitError.value = t("toybox.init_error_year_required");
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
    debugUnlockError.value = t("toybox.unlock_error_select");
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

/* Rules moved from style.css — only used in this component */

.nfc-note {
  margin-bottom: 1rem;
  font-size: 0.85rem;
  opacity: 0.7;
}

.nfc-compat {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--danger);
  background: rgba(248, 113, 113, 0.08);
  color: var(--danger);
  font-size: 0.85rem;
}

.nfc-status {
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: var(--accent);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: var(--accent-bg);
  border: 1px solid var(--accent-border);
}

.language-section {
  padding: 1.25rem;
}

.language-buttons {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.lang-btn {
  padding: 0.4rem 1.25rem;
  border-radius: 10px;
  border: 1.5px solid var(--border);
  background: var(--bg-card);
  color: var(--text);
  font-family: var(--sans);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s ease;
}

.lang-btn:hover {
  border-color: var(--accent-border);
  color: var(--accent);
}

.lang-btn.active {
  background: var(--accent-bg);
  border-color: var(--accent);
  color: var(--accent);
  box-shadow: var(--glow-gold);
}
</style>
