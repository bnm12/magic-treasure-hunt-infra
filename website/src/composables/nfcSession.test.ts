import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createNfcSession,
  type NfcAdapter,
  type NfcRecord,
} from "./nfcSession";

type Deferred = {
  resolve: () => void;
  reject: (error: unknown) => void;
};

class FakeNfcAdapter implements NfcAdapter {
  supported = true;
  scanOptions: Parameters<NfcAdapter["scan"]>[0] | undefined;
  writeMessage: NDEFMessageInit | undefined;
  writeSignal: AbortSignal | undefined;
  private scanDeferred: Deferred | undefined;
  private writeDeferred: Deferred | undefined;

  isSupported(): boolean {
    return this.supported;
  }

  scan(options: Parameters<NfcAdapter["scan"]>[0]): Promise<void> {
    this.scanOptions = options;
    return new Promise<void>((resolve, reject) => {
      this.scanDeferred = { resolve, reject };
      options.signal.addEventListener("abort", () => resolve(), { once: true });
    });
  }

  write(message: NDEFMessageInit, signal: AbortSignal): Promise<void> {
    this.writeMessage = message;
    this.writeSignal = signal;
    return new Promise<void>((resolve, reject) => {
      this.writeDeferred = { resolve, reject };
      signal.addEventListener("abort", () => resolve(), { once: true });
    });
  }

  emitReading(records: NfcRecord[]): void {
    this.scanOptions?.onReading(records);
  }

  emitReadingError(): void {
    this.scanOptions?.onReadingError();
  }

  rejectScan(error: unknown): void {
    this.scanDeferred?.reject(error);
  }

  resolveWrite(): void {
    this.writeDeferred?.resolve();
  }

  rejectWrite(error: unknown): void {
    this.writeDeferred?.reject(error);
  }
}

function record(data = new ArrayBuffer(0)): NfcRecord {
  return {
    recordType: "mime",
    mediaType: "application/x-hunt:2026",
    data,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createNfcSession", () => {
  it("reports unsupported capability without starting an operation", async () => {
    const adapter = new FakeNfcAdapter();
    adapter.supported = false;
    const session = createNfcSession(adapter);

    expect(session.state.value).toBe("unsupported");
    expect(session.isSupported()).toBe(false);
    await expect(session.startScan({ onReading: vi.fn(), onError: vi.fn() }))
      .resolves.toEqual({ ok: false, reason: "unsupported" });
    await expect(session.write({ records: [] }))
      .resolves.toEqual({ ok: false, reason: "unsupported" });
  });

  it("normalizes permission denial and returns to idle", async () => {
    const adapter = new FakeNfcAdapter();
    const session = createNfcSession(adapter);
    const onError = vi.fn();

    const resultPromise = session.startScan({ onReading: vi.fn(), onError });
    adapter.rejectScan(
      Object.assign(new Error("permission denied"), {
        name: "NotAllowedError",
      }),
    );

    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      reason: "permission-denied",
    });
    expect(onError).toHaveBeenCalledWith(
      "permission-denied",
      expect.any(Error),
    );
    expect(session.state.value).toBe("idle");
    expect(adapter.scanOptions?.signal.aborted).toBe(true);
  });

  it("reads one message and cleans up the scan", async () => {
    const adapter = new FakeNfcAdapter();
    const session = createNfcSession(adapter);
    const source = new Uint8Array([1, 2, 3]).buffer;

    const resultPromise = session.readOnce();
    adapter.emitReading([record(source)]);

    const result = await resultPromise;
    expect(result).toEqual({ ok: true, value: [record(source)] });
    expect(session.state.value).toBe("idle");
    expect(adapter.scanOptions?.signal.aborted).toBe(true);
  });

  it("normalizes a browser-shaped record to a copied ArrayBuffer", async () => {
    class BrowserReader {
      onreading?: (event: NDEFReadingEvent) => void;
      onreadingerror?: () => void;

      constructor() {
        browserReader = this;
      }

      scan({ signal }: { signal: AbortSignal }): Promise<void> {
        return new Promise<void>((resolve) => {
          signal.addEventListener("abort", () => resolve(), { once: true });
        });
      }

      write(): Promise<void> {
        return Promise.resolve();
      }

      emit(recordValue: NDEFRecord): void {
        this.onreading?.({
          message: { records: [recordValue] },
        } as NDEFReadingEvent);
      }
    }

    let browserReader: BrowserReader | undefined;
    vi.stubGlobal("window", {
      isSecureContext: true,
      NDEFReader: BrowserReader,
    });
    vi.stubGlobal("NDEFReader", BrowserReader);

    const session = createNfcSession();
    const source = new Uint8Array([9, 8, 7, 6]);
    const view = new DataView(source.buffer, 1, 2);
    const resultPromise = session.readOnce();
    browserReader?.emit({
      recordType: "mime",
      mediaType: "application/x-hunt:2026",
      data: view,
    } as NDEFRecord);

    const result = await resultPromise;
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0].data).toEqual(new Uint8Array([8, 7]).buffer);
      source[1] = 0;
      expect(result.value[0].data).toEqual(new Uint8Array([8, 7]).buffer);
    }
    expect(session.state.value).toBe("idle");
    expect(browserReader?.onreading).toBeNull();
    expect(browserReader?.onreadingerror).toBeNull();
  });

  it("normalizes read errors and aborts the active scan", async () => {
    const adapter = new FakeNfcAdapter();
    const session = createNfcSession(adapter);
    const onError = vi.fn();

    const resultPromise = session.startScan({ onReading: vi.fn(), onError });
    adapter.emitReadingError();

    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      reason: "read-failed",
    });
    expect(onError).toHaveBeenCalledWith("read-failed", expect.any(Error));
    expect(adapter.scanOptions?.signal.aborted).toBe(true);
    expect(session.state.value).toBe("idle");
  });

  it("rejects overlapping scans and writes while preserving the active state", async () => {
    const adapter = new FakeNfcAdapter();
    const session = createNfcSession(adapter);
    const scanPromise = session.startScan({
      onReading: vi.fn(),
      onError: vi.fn(),
    });

    expect(session.state.value).toBe("scanning");
    await expect(session.startScan({ onReading: vi.fn(), onError: vi.fn() }))
      .resolves.toEqual({ ok: false, reason: "busy" });
    await expect(session.write({ records: [] }))
      .resolves.toEqual({ ok: false, reason: "busy" });

    session.cancel();
    await scanPromise;
    expect(session.state.value).toBe("idle");
  });

  it("reports explicit cancellation and cleans up the scan signal", async () => {
    const adapter = new FakeNfcAdapter();
    const session = createNfcSession(adapter);
    const onError = vi.fn();
    const resultPromise = session.startScan({ onReading: vi.fn(), onError });

    session.cancel();

    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      reason: "cancelled",
    });
    expect(onError).toHaveBeenCalledWith("cancelled", expect.any(Error));
    expect(adapter.scanOptions?.signal.aborted).toBe(true);
    expect(session.state.value).toBe("idle");
  });

  it("reports write failures and restores the idle state", async () => {
    const adapter = new FakeNfcAdapter();
    const session = createNfcSession(adapter);
    const error = new Error("tag is locked");
    const resultPromise = session.write({ records: [] });

    expect(session.state.value).toBe("writing");
    adapter.rejectWrite(error);

    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      reason: "write-failed",
      error,
    });
    expect(adapter.writeSignal?.aborted).toBe(false);
    expect(session.state.value).toBe("idle");
  });

  it("completes successful writes and cleans up the write operation", async () => {
    const adapter = new FakeNfcAdapter();
    const session = createNfcSession(adapter);
    const message = { records: [{ recordType: "text", data: "hello" }] };
    const resultPromise = session.write(message);

    adapter.resolveWrite();

    await expect(resultPromise).resolves.toEqual({ ok: true, value: undefined });
    expect(adapter.writeMessage).toBe(message);
    expect(session.state.value).toBe("idle");
  });

  it("disposes active work and rejects later operations", async () => {
    const adapter = new FakeNfcAdapter();
    const session = createNfcSession(adapter);
    const resultPromise = session.startScan({
      onReading: vi.fn(),
      onError: vi.fn(),
    });

    session.dispose();

    await expect(resultPromise).resolves.toMatchObject({
      ok: false,
      reason: "cancelled",
    });
    expect(adapter.scanOptions?.signal.aborted).toBe(true);
    expect(session.state.value).toBe("idle");
    await expect(session.readOnce()).resolves.toMatchObject({
      ok: false,
      reason: "cancelled",
    });
    await expect(session.write({ records: [] })).resolves.toMatchObject({
      ok: false,
      reason: "cancelled",
    });
  });
});
