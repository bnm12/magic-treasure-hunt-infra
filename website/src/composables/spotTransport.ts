import { ref, type Ref } from "vue";

export type SpotTransportMode = "serial" | "bluetooth";

export interface SpotByteChannel {
  connect(): Promise<void>;
  write(bytes: Uint8Array): Promise<void>;
  close(): Promise<void>;
  onData(listener: (bytes: Uint8Array) => void): () => void;
  onDisconnect(listener: (error?: unknown) => void): () => void;
}

export interface SpotTransport {
  readonly isConnected: Readonly<Ref<boolean>>;
  readonly receivedText: Readonly<Ref<string>>;
  readonly error: Readonly<Ref<string>>;
  connect(mode: SpotTransportMode): Promise<void>;
  sendLine(command: string): Promise<void>;
  disconnect(): Promise<void>;
  onLine(listener: (line: string) => void): () => void;
  clearOutput(): void;
}

type ChannelFactory = () => SpotByteChannel;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function commandLine(command: string): string {
  return `${command.replace(/[\r\n]+$/g, "")}\n`;
}

export function createSpotTransport(
  factories: Record<SpotTransportMode, ChannelFactory>,
): SpotTransport {
  const isConnected = ref(false);
  const receivedText = ref("");
  const error = ref("");
  const lineListeners = new Set<(line: string) => void>();

  let activeChannel: SpotByteChannel | null = null;
  let activeCleanup: (() => void) | null = null;
  let connectionGeneration = 0;
  let decoder = new TextDecoder();
  let pendingLine = "";
  let writeQueue: Promise<void> = Promise.resolve();

  function resetDecoder(): void {
    decoder = new TextDecoder();
    pendingLine = "";
  }

  function detach(channel: SpotByteChannel): void {
    if (activeChannel !== channel) return;

    activeCleanup?.();
    activeCleanup = null;
    activeChannel = null;
    isConnected.value = false;
    resetDecoder();
  }

  function receive(channel: SpotByteChannel, bytes: Uint8Array): void {
    if (activeChannel !== channel) return;

    const text = decoder.decode(bytes, { stream: true });
    receivedText.value += text;
    pendingLine += text;

    let newlineIndex = pendingLine.indexOf("\n");
    while (newlineIndex >= 0) {
      const rawLine = pendingLine.slice(0, newlineIndex);
      pendingLine = pendingLine.slice(newlineIndex + 1);
      const line = rawLine.endsWith("\r")
        ? rawLine.slice(0, -1)
        : rawLine;
      for (const listener of lineListeners) listener(line);
      newlineIndex = pendingLine.indexOf("\n");
    }
  }

  async function closeChannel(channel: SpotByteChannel): Promise<void> {
    const isActive = activeChannel === channel;
    if (isActive) detach(channel);
    await channel.close();
  }

  async function connect(mode: SpotTransportMode): Promise<void> {
    const generation = ++connectionGeneration;
    const previousChannel = activeChannel;
    if (previousChannel) await closeChannel(previousChannel);

    error.value = "";
    resetDecoder();
    const channel = factories[mode]();
    const removeDataListener = channel.onData((bytes) => {
      receive(channel, bytes);
    });
    const removeDisconnectListener = channel.onDisconnect((disconnectError) => {
      if (activeChannel !== channel) return;
      if (disconnectError !== undefined) {
        error.value = `Connection lost: ${errorMessage(disconnectError)}`;
      }
      detach(channel);
    });
    const cleanup = () => {
      removeDataListener();
      removeDisconnectListener();
    };

    activeChannel = channel;
    activeCleanup = cleanup;

    try {
      await channel.connect();
      if (generation !== connectionGeneration || activeChannel !== channel) {
        cleanup();
        await channel.close();
        return;
      }
      isConnected.value = true;
    } catch (connectError) {
      if (activeChannel === channel) detach(channel);
      else cleanup();

      try {
        await channel.close();
      } catch (closeError) {
        error.value = `Connection failed: ${errorMessage(connectError)}; cleanup failed: ${errorMessage(closeError)}`;
        return;
      }

      error.value = `Connection failed: ${errorMessage(connectError)}`;
    }
  }

  async function disconnect(): Promise<void> {
    connectionGeneration += 1;
    const channel = activeChannel;
    if (!channel) {
      isConnected.value = false;
      return;
    }

    detach(channel);
    try {
      await channel.close();
    } catch (disconnectError) {
      error.value = `Disconnect failed: ${errorMessage(disconnectError)}`;
      throw disconnectError;
    }
  }

  async function sendLine(command: string): Promise<void> {
    const channel = activeChannel;
    if (!channel || !isConnected.value) {
      const notConnectedError = new Error("Spot writer is not connected.");
      error.value = notConnectedError.message;
      throw notConnectedError;
    }

    const bytes = new TextEncoder().encode(commandLine(command));
    const write = writeQueue.then(async () => {
      if (activeChannel !== channel || !isConnected.value) {
        throw new Error("Spot writer is not connected.");
      }
      await channel.write(bytes);
    });
    writeQueue = write.then(
      () => undefined,
      () => undefined,
    );

    try {
      await write;
    } catch (writeError) {
      if (activeChannel === channel) {
        error.value = `Write failed: ${errorMessage(writeError)}`;
      }
      throw writeError;
    }
  }

  function onLine(listener: (line: string) => void): () => void {
    lineListeners.add(listener);
    return () => lineListeners.delete(listener);
  }

  function clearOutput(): void {
    receivedText.value = "";
  }

  return {
    isConnected,
    receivedText,
    error,
    connect,
    sendLine,
    disconnect,
    onLine,
    clearOutput,
  };
}
