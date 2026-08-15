import { afterEach, describe, expect, it, vi } from "vitest";
import { createSerialChannel } from "./useSerial";

class FakeReader {
  releaseCount = 0;
  private resolveRead:
    | ((result: { done: boolean; value?: Uint8Array }) => void)
    | undefined;

  read(): Promise<{ done: boolean; value?: Uint8Array }> {
    return new Promise((resolve) => {
      this.resolveRead = resolve;
    });
  }

  async cancel(): Promise<void> {
    this.resolveRead?.({ done: true });
  }

  finish(): void {
    this.resolveRead?.({ done: true });
  }

  releaseLock(): void {
    this.releaseCount += 1;
  }
}

class FakeSerialPort {
  ondisconnect: SerialPort["ondisconnect"] = null;
  readonly reader = new FakeReader();
  readonly readable = {
    getReader: () => this.reader,
  } as unknown as ReadableStream<Uint8Array>;
  readonly writable = {} as WritableStream<Uint8Array>;
  closeCount = 0;

  getInfo(): SerialPortInfo {
    return {};
  }

  async open(): Promise<void> {}

  async setSignals(): Promise<void> {}

  async close(): Promise<void> {
    this.closeCount += 1;
  }

  triggerDisconnect(): void {
    this.ondisconnect?.call(this as unknown as SerialPort, new Event("disconnect"));
  }
}

async function connectPort(
  channel: ReturnType<typeof createSerialChannel>,
): Promise<void> {
  const connection = channel.connect();
  await vi.runAllTimersAsync();
  await connection;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("createSerialChannel", () => {
  it("does not let a stale reader release a replacement reader", async () => {
    vi.useFakeTimers();
    const firstPort = new FakeSerialPort();
    const secondPort = new FakeSerialPort();
    const ports = [firstPort, secondPort];
    vi.stubGlobal("navigator", {
      serial: {
        requestPort: vi.fn(async () => ports.shift() as FakeSerialPort),
      },
    });

    const channel = createSerialChannel();
    const onDisconnect = vi.fn();
    channel.onDisconnect(onDisconnect);

    await connectPort(channel);
    firstPort.triggerDisconnect();
    await connectPort(channel);

    firstPort.reader.finish();
    await Promise.resolve();

    expect(onDisconnect).toHaveBeenCalledTimes(1);
    expect(firstPort.reader.releaseCount).toBe(1);
    expect(secondPort.reader.releaseCount).toBe(0);

    secondPort.reader.finish();
    await Promise.resolve();
  });
});
