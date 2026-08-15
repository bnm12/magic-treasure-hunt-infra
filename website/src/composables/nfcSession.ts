import { computed, ref } from "vue";
import type { ComputedRef, Ref } from "vue";

export type NfcLifecycleState =
  | "unsupported"
  | "idle"
  | "scanning"
  | "writing";

export type NfcFailureReason =
  | "unsupported"
  | "permission-denied"
  | "busy"
  | "cancelled"
  | "timeout"
  | "read-failed"
  | "write-failed"
  | "unknown";

export interface NfcRecord {
  recordType: string;
  mediaType?: string;
  id?: string;
  encoding?: string;
  lang?: string;
  data?: ArrayBuffer;
}

export type NfcResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: NfcFailureReason; error?: Error };

export interface NfcScanHandlers {
  onReading(records: NfcRecord[]): void;
  onError(reason: NfcFailureReason, error?: Error): void;
  timeoutMs?: number;
}

export interface NfcAdapter {
  isSupported(): boolean;
  scan(options: {
    signal: AbortSignal;
    onReading(records: NfcRecord[]): void;
    onReadingError(): void;
  }): Promise<void>;
  write(message: NDEFMessageInit, signal: AbortSignal): Promise<void>;
}

export interface NfcSession {
  readonly state: Readonly<Ref<NfcLifecycleState>>;
  readonly supported: ComputedRef<boolean>;
  isSupported(): boolean;
  startScan(handlers: NfcScanHandlers): Promise<NfcResult<void>>;
  readOnce(timeoutMs?: number): Promise<NfcResult<NfcRecord[]>>;
  write(message: NDEFMessageInit): Promise<NfcResult<void>>;
  cancel(): void;
  dispose(): void;
}

export class NfcSessionError extends Error {
  readonly reason: NfcFailureReason;

  constructor(
    reason: NfcFailureReason,
    message?: string,
  ) {
    super(message ?? defaultFailureMessage(reason));
    this.reason = reason;
    this.name = "NfcSessionError";
  }
}

function defaultFailureMessage(reason: NfcFailureReason): string {
  switch (reason) {
    case "unsupported":
      return "Web NFC is not supported.";
    case "permission-denied":
      return "NFC permission was denied.";
    case "busy":
      return "NFC is already in use.";
    case "cancelled":
      return "The NFC operation was cancelled.";
    case "timeout":
      return "Timed out waiting for an NFC tag.";
    case "read-failed":
      return "The NFC tag could not be read.";
    case "write-failed":
      return "The NFC tag could not be written.";
    default:
      return "The NFC operation failed.";
  }
}

function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(String(error));
}

function errorName(error: unknown): string {
  if (typeof error === "object" && error !== null && "name" in error) {
    return String(error.name);
  }
  return "";
}

function failureReasonFor(error: unknown, operation: "read" | "write"): NfcFailureReason {
  if (error instanceof NfcSessionError) {
    return error.reason;
  }

  switch (errorName(error)) {
    case "NotSupportedError":
      return "unsupported";
    case "NotAllowedError":
    case "SecurityError":
      return "permission-denied";
    case "AbortError":
      return "cancelled";
    case "TimeoutError":
      return "timeout";
    case "ReadError":
      return "read-failed";
    default:
      return operation === "write" ? "write-failed" : "read-failed";
  }
}

function cloneRecordData(data: DataView | undefined): ArrayBuffer | undefined {
  if (!data) return undefined;
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength).slice()
    .buffer;
}

function toTransportRecord(record: NDEFRecord): NfcRecord {
  return {
    recordType: record.recordType,
    mediaType: record.mediaType,
    id: record.id,
    encoding: record.encoding,
    lang: record.lang,
    data: cloneRecordData(record.data),
  };
}

class BrowserNfcAdapter implements NfcAdapter {
  isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      window.isSecureContext &&
      "NDEFReader" in window
    );
  }

  async scan(options: {
    signal: AbortSignal;
    onReading(records: NfcRecord[]): void;
    onReadingError(): void;
  }): Promise<void> {
    const reader = new NDEFReader();
    reader.onreading = (event: NDEFReadingEvent) => {
      options.onReading(event.message.records.map(toTransportRecord));
    };
    reader.onreadingerror = () => options.onReadingError();
    await reader.scan({ signal: options.signal });
  }

  async write(message: NDEFMessageInit, signal: AbortSignal): Promise<void> {
    if (signal.aborted) {
      throw new NfcSessionError("cancelled");
    }
    const reader = new NDEFReader();
    await reader.write(message);
    if (signal.aborted) {
      throw new NfcSessionError("cancelled");
    }
  }
}

export function createNfcSession(
  adapter: NfcAdapter = new BrowserNfcAdapter(),
): NfcSession {
  const supported = computed(() => adapter.isSupported());
  const state = ref<NfcLifecycleState>(
    supported.value ? "idle" : "unsupported",
  );

  let disposed = false;
  let activeOperation: {
    controller: AbortController;
    finish(): void;
    cancel(): void;
  } | null = null;

  function setIdle() {
    state.value = adapter.isSupported() ? "idle" : "unsupported";
  }

  function startScan(handlers: NfcScanHandlers): Promise<NfcResult<void>> {
    if (disposed) {
      return Promise.resolve({
        ok: false,
        reason: "cancelled",
        error: new NfcSessionError("cancelled", "The NFC session was disposed."),
      });
    }
    if (!adapter.isSupported()) {
      state.value = "unsupported";
      return Promise.resolve({ ok: false, reason: "unsupported" });
    }
    if (activeOperation) {
      return Promise.resolve({ ok: false, reason: "busy" });
    }

    const controller = new AbortController();
    const timeoutMs = handlers.timeoutMs ?? 30_000;
    let finished = false;
    const timeout = setTimeout(() => {
      if (finished) return;
      handlers.onError("timeout", new NfcSessionError("timeout"));
      finish();
      controller.abort();
    }, timeoutMs);

    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      if (activeOperation?.controller === controller) {
        activeOperation = null;
        setIdle();
      }
    }

    function cancel() {
      if (finished) return;
      handlers.onError(
        "cancelled",
        new NfcSessionError("cancelled"),
      );
      finish();
      controller.abort();
    }

    activeOperation = { controller, finish, cancel };
    state.value = "scanning";

    return adapter
      .scan({
        signal: controller.signal,
        onReading: (records) => {
          if (finished) return;
          finish();
          handlers.onReading(records);
        },
        onReadingError: () => {
          if (finished) return;
          handlers.onError(
            "read-failed",
            new NfcSessionError("read-failed"),
          );
          finish();
        },
      })
      .then(
        () => ({ ok: true, value: undefined }),
        (error: unknown) => {
          if (finished) return { ok: true, value: undefined };
          const normalized = toError(error);
          const reason = failureReasonFor(normalized, "read");
          handlers.onError(reason, normalized);
          finish();
          return { ok: false, reason, error: normalized };
        },
      );
  }

  async function readOnce(timeoutMs = 15_000): Promise<NfcResult<NfcRecord[]>> {
    return await new Promise<NfcResult<NfcRecord[]>>((resolve) => {
      let settled = false;

      const settle = (result: NfcResult<NfcRecord[]>) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };

      void startScan({
        timeoutMs,
        onReading: (records) => settle({ ok: true, value: records }),
        onError: (reason, error) => settle({ ok: false, reason, error }),
      }).then((result) => {
        if (!result.ok) {
          settle(result);
        }
      });
    });
  }

  async function write(message: NDEFMessageInit): Promise<NfcResult<void>> {
    if (disposed) {
      return {
        ok: false,
        reason: "cancelled",
        error: new NfcSessionError("cancelled", "The NFC session was disposed."),
      };
    }
    if (!adapter.isSupported()) {
      state.value = "unsupported";
      return { ok: false, reason: "unsupported" };
    }
    if (activeOperation) {
      return { ok: false, reason: "busy" };
    }

    const controller = new AbortController();
    let finished = false;

    function finish() {
      if (finished) return;
      finished = true;
      if (activeOperation?.controller === controller) {
        activeOperation = null;
        setIdle();
      }
    }

    function cancel() {
      if (finished) return;
      finish();
      controller.abort();
    }

    activeOperation = { controller, finish, cancel };
    state.value = "writing";

    try {
      await adapter.write(message, controller.signal);
      if (controller.signal.aborted) {
        return {
          ok: false,
          reason: "cancelled",
          error: new NfcSessionError("cancelled"),
        };
      }
      return { ok: true, value: undefined };
    } catch (error: unknown) {
      const normalized = toError(error);
      const reason = failureReasonFor(normalized, "write");
      return { ok: false, reason, error: normalized };
    } finally {
      finish();
    }
  }

  function cancel() {
    activeOperation?.cancel();
  }

  function dispose() {
    disposed = true;
    cancel();
  }

  return {
    state,
    supported,
    isSupported: () => adapter.isSupported(),
    startScan,
    readOnce,
    write,
    cancel,
    dispose,
  };
}
