import { ref, onUnmounted } from "vue";

export function useSerial() {
  const port = ref<SerialPort | null>(null);
  const reader = ref<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const receivedText = ref("");
  const isConnected = ref(false);
  const error = ref("");

  async function connect() {
    error.value = "";
    try {
      if (!("serial" in navigator)) {
        throw new Error("Web Serial API not supported in this browser.");
      }

      port.value = await navigator.serial.requestPort();
      const info = port.value.getInfo();
      console.log("Serial port info:", info);

      await port.value.open({ baudRate: 115200 });

      // Deassert both signals first to avoid bootloader entry
      await port.value.setSignals({
        dataTerminalReady: false,
        requestToSend: false,
      });
      await new Promise((r) => setTimeout(r, 50));

      // RTS pulse to reset device if stuck in ROM bootloader
      await port.value.setSignals({ requestToSend: true });
      await new Promise((r) => setTimeout(r, 100));
      await port.value.setSignals({ requestToSend: false });

      // Wait for sketch to boot (covers PN532 boot delay)
      await new Promise((r) => setTimeout(r, 2500));
      receivedText.value = "";

      isConnected.value = true;
      readLoop();
    } catch (e) {
      error.value = (e as Error).message;
      isConnected.value = false;
    }
  }

  async function disconnect() {
    if (reader.value) {
      await reader.value.cancel();
    }
    if (port.value) {
      await port.value.close();
    }
    isConnected.value = false;
    port.value = null;
    reader.value = null;
  }

  async function send(text: string) {
    if (!port.value || !port.value.writable) {
      error.value = "Serial port not writable.";
      return;
    }

    const writer = port.value.writable.getWriter();
    const encoder = new TextEncoder();
    await writer.write(encoder.encode(text));
    writer.releaseLock();
  }

  async function readLoop() {
    if (!port.value || !port.value.readable) return;

    try {
      reader.value = port.value.readable.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.value.read();
        if (done) {
          break;
        }
        if (value) {
          receivedText.value += decoder.decode(value);
        }
      }
    } catch (e) {
      error.value = `Read error: ${(e as Error).message}`;
    } finally {
      if (reader.value) {
        reader.value.releaseLock();
        reader.value = null;
      }
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
