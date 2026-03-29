import { ref, onUnmounted, computed, watch } from "vue";
import { useSerial } from "./useSerial";
import { useBluetooth } from "./useBluetooth";

export function useCommunication() {
  const serial = useSerial();
  const bluetooth = useBluetooth();

  const activeMode = ref<"serial" | "bluetooth" | null>(null);

  const isConnected = computed(() => {
    if (activeMode.value === "serial") return serial.isConnected.value;
    if (activeMode.value === "bluetooth") return bluetooth.isConnected.value;
    return false;
  });

  const receivedText = computed({
    get: () => {
      if (activeMode.value === "serial") return serial.receivedText.value;
      if (activeMode.value === "bluetooth") return bluetooth.receivedText.value;
      return "";
    },
    set: (val: string) => {
      if (activeMode.value === "serial") serial.receivedText.value = val;
      if (activeMode.value === "bluetooth") bluetooth.receivedText.value = val;
    },
  });

  const error = computed(() => {
    if (activeMode.value === "serial") return serial.error.value;
    if (activeMode.value === "bluetooth") return bluetooth.error.value;
    return "";
  });

  async function connectSerial() {
    activeMode.value = "serial";
    await serial.connect();
    if (!serial.isConnected.value) activeMode.value = null;
  }

  async function connectBluetooth() {
    activeMode.value = "bluetooth";
    await bluetooth.connect();
    if (!bluetooth.isConnected.value) activeMode.value = null;
  }

  async function disconnect() {
    if (activeMode.value === "serial") await serial.disconnect();
    if (activeMode.value === "bluetooth") await bluetooth.disconnect();
    activeMode.value = null;
  }

  async function send(text: string) {
    if (activeMode.value === "serial") await serial.send(text);
    if (activeMode.value === "bluetooth") await bluetooth.send(text);
  }

  // Monitor disconnection from outside (e.g., physical disconnection)
  watch(
    [serial.isConnected, bluetooth.isConnected],
    ([serialConnected, bluetoothConnected]) => {
      if (activeMode.value === "serial" && !serialConnected) activeMode.value = null;
      if (activeMode.value === "bluetooth" && !bluetoothConnected) activeMode.value = null;
    }
  );

  onUnmounted(() => {
    void disconnect();
  });

  return {
    isConnected,
    receivedText,
    error,
    connectSerial,
    connectBluetooth,
    disconnect,
    send,
  };
}
