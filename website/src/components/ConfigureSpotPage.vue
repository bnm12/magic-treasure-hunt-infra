<template>
  <div class="configure-spot-page page">
    <PageHero
      :icon="IconWandTweaker"
      :eyebrow="t('configure_page.eyebrow')"
      :title="t('configure_page.title')"
      :copy="t('configure_page.copy')"
      :compact="true"
    />

    <div class="configure-content glass-card">
      <div v-if="!isConnected" class="connect-section">
        <p class="instruction-text">
          {{ t('configure_page.connect_instruction') }}
        </p>
        <div class="connect-buttons">
          <button @click="connectSerial" class="primary-btn">
            🔌 {{ t('configure_page.connect_usb') }}
          </button>
          <button @click="connectBluetooth" class="primary-btn bluetooth-btn">
            📡 {{ t('configure_page.connect_bluetooth') }}
          </button>
        </div>
      </div>

      <div v-else class="config-section">
        <div class="status-bar">
          <span class="status-indicator connected">{{ t('configure_page.connected') }}</span>
          <button @click="disconnect" class="text-btn">{{ t('configure_page.disconnect') }}</button>
        </div>

        <div class="current-config">
          <div class="config-grid">
            <div class="form-group">
              <label for="year-select">{{ t('configure_page.year_label') }}</label>
              <select
                id="year-select"
                v-model="deviceHuntYear"
                @change="updateYear"
                class="nfc-input"
              >
                <option disabled :value="0">{{ t('configure_page.year_placeholder') }}</option>
                <option
                  v-for="year in availableYears"
                  :key="year"
                  :value="year"
                >
                  {{ year }}
                </option>
              </select>
              <div v-if="currentHuntTitle" class="selection-info">
                {{ currentHuntTitle }}
              </div>
            </div>
            <div class="form-group">
              <label for="spot-select">{{ t('configure_page.spot_label') }}</label>
              <select
                id="spot-select"
                v-model="deviceSpotId"
                @change="updateSpot"
                class="nfc-input"
              >
                <option disabled :value="0">{{ t('configure_page.spot_placeholder') }}</option>
                <option v-for="id in availableSpots" :key="id" :value="id">
                  {{ t('configure_page.spot_option', { id }) }}
                </option>
              </select>
              <div v-if="currentSpotName" class="selection-info">
                {{ currentSpotName }}
              </div>
            </div>
          </div>
        </div>

        <div class="divider-magic"></div>

        <div class="terminal glass-card">
          <div class="terminal-header">{{ t('configure_page.terminal_header') }}</div>
          <pre ref="terminalContent" class="terminal-content">{{
            receivedText || t('configure_page.terminal_placeholder')
          }}</pre>
          <button
            @click="clearTerminal"
            class="clear-terminal-btn"
            v-if="receivedText"
          >
            {{ t('configure_page.terminal_clear') }}
          </button>
        </div>

        <div class="form-group">
          <label for="serial-input">{{ t('configure_page.send_label') }}</label>
          <div class="input-with-button">
            <input
              v-model="inputText"
              id="serial-input"
              class="nfc-input"
              type="text"
              :placeholder="t('configure_page.send_placeholder')"
              @keyup.enter="handleSend"
            />
            <button
              @click="handleSend"
              :disabled="!inputText.trim()"
              class="send-btn"
            >
              {{ t('configure_page.send_btn') }}
            </button>
          </div>
          <div class="quick-commands">
            <button @click="quickSend('setSpot: ')" class="chip">
              setSpot:
            </button>
            <button @click="quickSend('setYear: ')" class="chip">
              setYear:
            </button>
            <button @click="quickSend('getConfig')" class="chip">
              getConfig
            </button>
          </div>
        </div>
      </div>

      <p v-if="error" class="validation-error" role="alert">
        {{ error }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, computed } from "vue";
import { useI18n } from "vue-i18n";
import PageHero from "./PageHero.vue";
import IconWandTweaker from "./icons/IconWandTweaker.vue";
import { useCommunication } from "../composables/useCommunication";
import { loadHunts, type HuntYear } from "../utils/spotLoader";

const { t } = useI18n();
const {
  isConnected,
  receivedText,
  error,
  connectSerial,
  connectBluetooth,
  disconnect,
  send,
} = useCommunication();

const inputText = ref("");
const terminalContent = ref<HTMLElement | null>(null);

const hunts = ref<Record<number, HuntYear>>({});
const availableYears = ref<number[]>([]);
const deviceHuntYear = ref<number>(0);
const deviceSpotId = ref<number>(0);
let lastProcessedIndex = -1;

const currentHuntTitle = computed(() => {
  return hunts.value[deviceHuntYear.value]?.title || "";
});

const currentSpotName = computed(() => {
  const hunt = hunts.value[deviceHuntYear.value];
  if (!hunt) return "";
  return hunt.spots[String(deviceSpotId.value)]?.name || "";
});

const availableSpots = computed<number[]>(() => {
  const hunt = hunts.value[deviceHuntYear.value];
  if (!hunt) return [];
  return Object.keys(hunt.spots)
    .map(Number)
    .sort((a, b) => a - b);
});

onMounted(async () => {
  hunts.value = await loadHunts();
  availableYears.value = Object.keys(hunts.value)
    .map(Number)
    .sort((a, b) => b - a);
});

watch(isConnected, (connected) => {
  if (connected) {
    // Small delay to let the device boot/be ready
    setTimeout(() => {
      void send("getConfig\n");
    }, 500);
  }
});

function handleSend() {
  const text = inputText.value.trim();
  if (text) {
    void send(text + "\n");
    inputText.value = "";
  }
}

function quickSend(cmd: string) {
  inputText.value = cmd;
  // Focus the input
  document.getElementById("serial-input")?.focus();
}

function clearTerminal() {
  receivedText.value = "";
  lastProcessedIndex = -1;
}

function updateYear() {
  if (deviceHuntYear.value) {
    void send(`setYear: ${deviceHuntYear.value}\n`);
  }
}

function updateSpot() {
  if (deviceSpotId.value) {
    void send(`setSpot: ${deviceSpotId.value}\n`);
  }
}

// Auto-scroll terminal to bottom and parse for config
watch(receivedText, (text) => {
  // Parse for CONFIG:ID,YEAR
  const matches = [...text.matchAll(/CONFIG:(\d+),(\d+)/g)];
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    const matchIndex = lastMatch.index ?? -1;

    // Only update if we found a new CONFIG message we haven't processed
    if (matchIndex > lastProcessedIndex) {
      const id = parseInt(lastMatch[1], 10);
      const year = parseInt(lastMatch[2], 10);
      deviceSpotId.value = id;
      deviceHuntYear.value = year;
      lastProcessedIndex = matchIndex;
    }
  }

  nextTick(() => {
    if (terminalContent.value) {
      terminalContent.value.scrollTop = terminalContent.value.scrollHeight;
    }
  });
});
</script>

<style scoped>
.configure-spot-page {
  padding: 0 1.5rem 2rem;
  max-width: 600px;
  margin: 0 auto;
}

.configure-content {
  padding: 2rem;
  margin-top: 1rem;
}

.instruction-text {
  color: var(--text);
  margin-bottom: 2rem;
  text-align: center;
  line-height: 1.6;
}

.connect-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.primary-btn {
  width: 100%;
  justify-content: center;
  font-size: 1.1rem;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bluetooth-btn {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: white;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.status-indicator {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
}

.status-indicator.connected {
  background: rgba(34, 197, 94, 0.2);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.config-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.text-btn {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: underline;
  opacity: 0.8;
}

.text-btn:hover {
  opacity: 1;
}

.terminal {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--accent-border);
  border-radius: 8px;
  margin-bottom: 1.5rem;
  position: relative;
}

.terminal-header {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid var(--accent-border);
  color: var(--accent);
}

.terminal-content {
  height: 200px;
  overflow-y: auto;
  padding: 1rem;
  font-family: "Courier New", Courier, monospace;
  font-size: 0.85rem;
  color: #a3e635; /* Terminal green */
  white-space: pre-wrap;
  margin: 0;
}

.clear-terminal-btn {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 4px;
  color: var(--text);
  font-size: 0.6rem;
  padding: 2px 6px;
  cursor: pointer;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.form-group label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-h);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.selection-info {
  font-size: 0.75rem;
  color: var(--accent);
  font-style: italic;
  margin-top: -0.4rem;
  min-height: 1rem;
}

.input-with-button {
  display: flex;
  gap: 0.5rem;
}

.input-with-button input {
  flex: 1;
}

.send-btn {
  padding: 0 1.5rem;
  background: var(--gradient-gold);
  border: none;
  border-radius: 8px;
  color: var(--bg);
  font-weight: 700;
  cursor: pointer;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quick-commands {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.chip {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--accent-border);
  border-radius: 4px;
  color: var(--text);
  font-size: 0.75rem;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.chip:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--accent);
}

.validation-error {
  color: var(--danger);
  font-size: 0.85rem;
  margin-top: 1rem;
  text-align: center;
}
</style>
