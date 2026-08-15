import type { SpotByteChannel } from "./spotTransport";

const BAUD_RATE = 115200;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createSerialChannel(): SpotByteChannel {
  let port: SerialPort | null = null;
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let readLoopPromise: Promise<void> | null = null;
  let activeConnectionId = 0;
  let closing = false;
  let disconnectNotified = false;
  const dataListeners = new Set<(bytes: Uint8Array) => void>();
  const disconnectListeners = new Set<(error?: unknown) => void>();

  function notifyDisconnect(disconnectError?: unknown): void {
    if (disconnectNotified) return;
    disconnectNotified = true;
    for (const listener of disconnectListeners) listener(disconnectError);
  }

  function handlePortDisconnect(
    connectionId: number,
    disconnectError?: unknown,
  ): void {
    if (activeConnectionId !== connectionId) return;

    const disconnectedPort = port;
    if (disconnectedPort) disconnectedPort.ondisconnect = null;
    port = null;
    notifyDisconnect(disconnectError);
  }

  async function readLoop(
    currentPort: SerialPort,
    connectionId: number,
  ): Promise<void> {
    let currentReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    try {
      currentReader = currentPort.readable.getReader();
      if (activeConnectionId === connectionId) reader = currentReader;

      while (true) {
        const { value, done } = await currentReader.read();
        if (done) break;
        if (value) {
          for (const listener of dataListeners) listener(value);
        }
      }
    } catch (readError) {
      if (
        !closing &&
        port === currentPort &&
        activeConnectionId === connectionId
      ) {
        handlePortDisconnect(connectionId, readError);
      }
    } finally {
      if (currentReader) {
        currentReader.releaseLock();
      }
      if (activeConnectionId === connectionId) {
        reader = null;
        readLoopPromise = null;
      }
      if (
        !closing &&
        port === currentPort &&
        activeConnectionId === connectionId
      ) {
        handlePortDisconnect(connectionId);
      }
    }
  }

  async function close(): Promise<void> {
    const currentPort = port;
    if (!currentPort) return;

    closing = true;
    let closeError: unknown;
    const currentReader = reader;
    if (currentReader) {
      try {
        await currentReader.cancel();
      } catch (error) {
        closeError = error;
      }
    }
    if (readLoopPromise) await readLoopPromise;

    currentPort.ondisconnect = null;
    try {
      await currentPort.close();
    } catch (error) {
      closeError ??= error;
    }

    port = null;
    reader = null;
    readLoopPromise = null;
    activeConnectionId = 0;
    closing = false;
    disconnectNotified = false;
    if (closeError !== undefined) throw closeError;
  }

  async function connect(): Promise<void> {
    await close();
    const serial = navigator.serial;
    if (!serial) {
      throw new Error("Web Serial API not supported in this browser.");
    }

    const selectedPort = await serial.requestPort();
    port = selectedPort;
    const connectionId = ++activeConnectionId;
    disconnectNotified = false;
    selectedPort.ondisconnect = () => handlePortDisconnect(connectionId);

    try {
      await selectedPort.open({ baudRate: BAUD_RATE });

      await selectedPort.setSignals({
        dataTerminalReady: false,
        requestToSend: false,
      });
      await wait(50);
      await selectedPort.setSignals({ requestToSend: true });
      await wait(100);
      await selectedPort.setSignals({ requestToSend: false });
      await wait(2500);

      readLoopPromise = readLoop(selectedPort, connectionId);
    } catch (connectError) {
      try {
        await close();
      } catch (closeError) {
        throw new Error(
          `Serial connection failed: ${errorMessage(connectError)}; cleanup failed: ${errorMessage(closeError)}`,
        );
      }
      throw connectError;
    }
  }

  async function write(bytes: Uint8Array): Promise<void> {
    const currentPort = port;
    if (!currentPort?.writable) {
      throw new Error("Serial port not writable.");
    }

    const writer = currentPort.writable.getWriter();
    try {
      await writer.write(bytes);
    } finally {
      writer.releaseLock();
    }
  }

  return {
    connect,
    write,
    close,
    onData(listener) {
      dataListeners.add(listener);
      return () => dataListeners.delete(listener);
    },
    onDisconnect(listener) {
      disconnectListeners.add(listener);
      return () => disconnectListeners.delete(listener);
    },
  };
}
