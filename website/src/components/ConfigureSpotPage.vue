<template>
  <div class="configure-spot-page page">
    <PageHero
      :icon="IconWandTweaker"
      eyebrow="Device Configuration"
      title="Spot Configurator"
      copy="Connect to a Magic Spot over USB to configure its ID and year."
      :compact="true"
    />

    <div class="configure-content glass-card">
      <div v-if="!isConnected" class="connect-section">
        <p class="instruction-text">
          Connect your device via USB and click the button below to start
          configuration.
        </p>
        <button @click="connect" class="primary-btn">
          🔌 Connect to Device
        </button>
      </div>

      <div v-else class="config-section">
        <div class="status-bar">
          <span class="status-indicator connected">Connected</span>
          <button @click="disconnect" class="text-btn">Disconnect</button>
        </div>

        <div class="current-config">
          <div class="config-grid">
            <div class="form-group">
              <label for="year-select">Hunt Year</label>
              <select
                id="year-select"
                v-model="deviceHuntYear"
                @change="updateYear"
                class="nfc-input"
              >
                <option disabled :value="0">Select Year</option>
                <option
                  v-for="year in availableYears"
                  :key="year"
                  :value="year"
                >
                  {{ year }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label for="spot-select">Spot ID</label>
              <select
                id="spot-select"
                v-model="deviceSpotId"
                @change="updateSpot"
                class="nfc-input"
              >
                <option disabled :value="0">Select Spot</option>
                <option v-for="id in availableSpots" :key="id" :value="id">
                  Spot {{ id }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="divider-magic"></div>

        <div class="terminal glass-card">
          <div class="terminal-header">Received Data</div>
          <pre ref="terminalContent" class="terminal-content">{{
            receivedText || "Waiting for data..."
          }}</pre>
          <button
            @click="clearTerminal"
            class="clear-terminal-btn"
            v-if="receivedText"
          >
            Clear
          </button>
        </div>

        <div class="form-group">
          <label for="serial-input">Send Command</label>
          <div class="input-with-button">
            <input
              v-model="inputText"
              id="serial-input"
              class="nfc-input"
              type="text"
              placeholder="e.g., setSpot: 5"
              @keyup.enter="handleSend"
            />
            <button
              @click="handleSend"
              :disabled="!inputText.trim()"
              class="send-btn"
            >
              Send
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
import { ref, watch, nextTick, onMounted } from "vue";
import PageHero from "./PageHero.vue";
import IconWandTweaker from "./icons/IconWandTweaker.vue";
import { useSerial } from "../composables/useSerial";
import { getAvailableYears, getSpotIdsForYear } from "../utils/spotLoader";

const { isConnected, receivedText, error, connect, disconnect, send } =
  useSerial();

const inputText = ref("");
const terminalContent = ref<HTMLElement | null>(null);

const availableYears = ref<number[]>([]);
const availableSpots = ref<number[]>([]);
const deviceHuntYear = ref<number>(0);
const deviceSpotId = ref<number>(0);

onMounted(async () => {
  availableYears.value = await getAvailableYears();
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

watch(deviceHuntYear, async (year) => {
  if (year) {
    availableSpots.value = await getSpotIdsForYear(year);
  } else {
    availableSpots.value = [];
  }
});

// Auto-scroll terminal to bottom and parse for config
watch(receivedText, (text) => {
  // Parse for CONFIG:ID,YEAR
  const matches = [...text.matchAll(/CONFIG:(\d+),(\d+)/g)];
  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    const id = parseInt(lastMatch[1], 10);
    const year = parseInt(lastMatch[2], 10);
    deviceSpotId.value = id;
    deviceHuntYear.value = year;
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

.primary-btn {
  width: 100%;
  justify-content: center;
  font-size: 1.1rem;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
