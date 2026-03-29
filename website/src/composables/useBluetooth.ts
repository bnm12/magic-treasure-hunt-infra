import { ref, onUnmounted } from "vue";

export function useBluetooth() {
  const device = ref<any | null>(null);
  const rxCharacteristic = ref<any | null>(null);
  const txCharacteristic = ref<any | null>(null);
  const receivedText = ref("");
  const isConnected = ref(false);
  const error = ref("");

  const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
  const RX_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
  const TX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

  async function connect() {
    error.value = "";
    try {
      if (!(navigator as any).bluetooth) {
        throw new Error("Web Bluetooth API not supported in this browser.");
      }

      device.value = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
        optionalServices: [SERVICE_UUID],
      });

      const server = await device.value.gatt?.connect();
      const service = await server?.getPrimaryService(SERVICE_UUID);
      rxCharacteristic.value = (await service?.getCharacteristic(RX_UUID)) || null;
      txCharacteristic.value = (await service?.getCharacteristic(TX_UUID)) || null;

      if (txCharacteristic.value) {
        await txCharacteristic.value.startNotifications();
        txCharacteristic.value.addEventListener("characteristicvaluechanged", handleNotifications);
      }

      isConnected.value = true;
      device.value.addEventListener("gattserverdisconnected", onDisconnected);
    } catch (e) {
      error.value = (e as Error).message;
      isConnected.value = false;
    }
  }

  function handleNotifications(event: any) {
    const value = (event.target as any).value;
    if (value) {
      const decoder = new TextDecoder();
      receivedText.value += decoder.decode(value);
    }
  }

  function onDisconnected() {
    isConnected.value = false;
    device.value = null;
    rxCharacteristic.value = null;
    txCharacteristic.value = null;
  }

  async function disconnect() {
    if (device.value?.gatt?.connected) {
      device.value.gatt.disconnect();
    }
    onDisconnected();
  }

  async function send(text: string) {
    if (!rxCharacteristic.value) {
      error.value = "Bluetooth characteristic not available.";
      return;
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    // Split into chunks of 20 bytes for BLE compatibility
    for (let i = 0; i < data.length; i += 20) {
      const chunk = data.slice(i, i + 20);
      await rxCharacteristic.value.writeValue(chunk);
    }
  }

  onUnmounted(() => {
    void disconnect();
  });

  return {
    isConnected,
    receivedText,
    error,
    connect,
    disconnect,
    send,
  };
}
