import { describe, expect, it } from "vitest";
import { createSpotTransport, type SpotByteChannel } from "./spotTransport";

class FakeByteChannel implements SpotByteChannel {
  private dataListeners = new Set<(bytes: Uint8Array) => void>();
  private disconnectListeners = new Set<(error?: unknown) => void>();
  private writeResolvers: Array<() => void> = [];
  writes: Uint8Array[] = [];
  closed = false;
  connectError: unknown;
  blockWrites = false;

  async connect(): Promise<void> {
    if (this.connectError !== undefined) throw this.connectError;
  }

  async write(bytes: Uint8Array): Promise<void> {
    this.writes.push(bytes);
    if (this.blockWrites) {
      await new Promise<void>((resolve) => {
        this.writeResolvers.push(resolve);
      });
    }
  }

  async close(): Promise<void> {
    this.closed = true;
  }

  onData(listener: (bytes: Uint8Array) => void): () => void {
    this.dataListeners.add(listener);
    return () => this.dataListeners.delete(listener);
  }

  onDisconnect(listener: (error?: unknown) => void): () => void {
    this.disconnectListeners.add(listener);
    return () => this.disconnectListeners.delete(listener);
  }

  emitData(text: string): void {
    this.emitBytes(new TextEncoder().encode(text));
  }

  emitBytes(bytes: Uint8Array): void {
    for (const listener of this.dataListeners) listener(bytes);
  }

  emitDisconnect(error?: unknown): void {
    for (const listener of this.disconnectListeners) listener(error);
  }

  releaseWrite(): void {
    this.writeResolvers.shift()?.();
  }
}

describe("createSpotTransport", () => {
  it("decodes split UTF-8 data and emits complete lines", async () => {
    const channel = new FakeByteChannel();
    const transport = createSpotTransport({
      serial: () => channel,
      bluetooth: () => channel,
    });
    const lines: string[] = [];
    transport.onLine((line) => lines.push(line));

    await transport.connect("serial");
    const bytes = new TextEncoder().encode("CONFIG:1,2026 é\r\nNEXT\n");
    channel.emitBytes(bytes.slice(0, bytes.indexOf(0xc3) + 1));
    channel.emitBytes(bytes.slice(bytes.indexOf(0xc3) + 1));

    expect(lines).toEqual(["CONFIG:1,2026 é", "NEXT"]);
    expect(transport.receivedText.value).toBe("CONFIG:1,2026 é\r\nNEXT\n");
  });

  it("frames every command with exactly one newline", async () => {
    const channel = new FakeByteChannel();
    const transport = createSpotTransport({
      serial: () => channel,
      bluetooth: () => channel,
    });

    await transport.connect("serial");
    await transport.sendLine("getConfig\n");
    await transport.sendLine("setSpot: 4\r\n");

    expect(
      channel.writes.map((bytes) => new TextDecoder().decode(bytes)),
    ).toEqual(["getConfig\n", "setSpot: 4\n"]);
  });

  it("rejects commands containing more than one protocol line", async () => {
    const channel = new FakeByteChannel();
    const transport = createSpotTransport({
      serial: () => channel,
      bluetooth: () => channel,
    });

    await transport.connect("serial");

    await expect(transport.sendLine("setSpot: 4\ngetConfig")).rejects.toThrow(
      "single-line",
    );
    expect(channel.writes).toEqual([]);
    expect(transport.error.value).toBe(
      "Spot writer commands must be single-line.",
    );
  });

  it("serializes writes through the active channel", async () => {
    const channel = new FakeByteChannel();
    channel.blockWrites = true;
    const transport = createSpotTransport({
      serial: () => channel,
      bluetooth: () => channel,
    });

    await transport.connect("serial");
    const firstWrite = transport.sendLine("first");
    const secondWrite = transport.sendLine("second");
    await Promise.resolve();
    await Promise.resolve();

    expect(channel.writes.map((bytes) => new TextDecoder().decode(bytes))).toEqual([
      "first\n",
    ]);

    channel.releaseWrite();
    await firstWrite;
    await Promise.resolve();
    await Promise.resolve();
    expect(channel.writes.map((bytes) => new TextDecoder().decode(bytes))).toEqual([
      "first\n",
      "second\n",
    ]);
    channel.releaseWrite();
    await secondWrite;
  });

  it("ignores a stale channel disconnect after reconnecting", async () => {
    const firstChannel = new FakeByteChannel();
    const secondChannel = new FakeByteChannel();
    const channels = [firstChannel, secondChannel];
    const transport = createSpotTransport({
      serial: () => channels.shift() ?? secondChannel,
      bluetooth: () => secondChannel,
    });

    await transport.connect("serial");
    await transport.connect("serial");
    firstChannel.emitDisconnect(new Error("old channel"));

    expect(transport.isConnected.value).toBe(true);
    expect(transport.error.value).toBe("");
  });

  it("closes a channel after a failed connection", async () => {
    const channel = new FakeByteChannel();
    channel.connectError = new Error("permission denied");
    const transport = createSpotTransport({
      serial: () => channel,
      bluetooth: () => channel,
    });

    await transport.connect("serial");

    expect(channel.closed).toBe(true);
    expect(transport.isConnected.value).toBe(false);
    expect(transport.error.value).toBe("Connection failed: permission denied");
  });

  it("makes explicit disconnect idempotent", async () => {
    const channel = new FakeByteChannel();
    const transport = createSpotTransport({
      serial: () => channel,
      bluetooth: () => channel,
    });

    await transport.connect("serial");
    await transport.disconnect();
    await transport.disconnect();

    expect(channel.closed).toBe(true);
    expect(transport.isConnected.value).toBe(false);
  });
});
