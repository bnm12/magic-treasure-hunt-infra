import { computed, inject, ref } from "vue";
import type { ComputedRef, InjectionKey, Ref } from "vue";
import { i18n } from "../i18n";
import { resolveAppUrl } from "../utils/appUrl";
import {
  buildInitializationWritePlan,
  buildWandWritePlan,
  decodeWandRecords,
  normalizeNdefRecordInit,
  normalizeNfcRecords,
  toNdefRecordInit,
  type WandDiagnostic,
  type WandMetadata as CodecWandMetadata,
} from "../utils/wandLedgerCodec";
import {
  buildToyRecord,
  type ToyRecordWriteRequest,
} from "../utils/toyboxRecord1";
import {
  createNfcSession,
  NfcSessionError,
  type NfcFailureReason,
  type NfcRecord,
  type NfcSession,
} from "./nfcSession";

const { t } = i18n.global;

export type ScanResult =
  | "ok"
  | "needs-gesture"
  | "unsupported"
  | "busy";

export interface NfcStore {
  isScanning: ComputedRef<boolean>;
  isWriting: ComputedRef<boolean>;
  status: Ref<string>;
  nfcCompatMessage: Ref<string>;
  record1Preview: Ref<string>;
  collectedSpots: Ref<Record<number, number[]>>;
  wandMetadata: Ref<WandMetadata | null>;
  wandDiagnostics: Ref<WandDiagnostic[]>;
  nfcSupported(): boolean;
  beginScanning(): Promise<ScanResult>;
  writeRecord1(request: ToyRecordWriteRequest): Promise<void>;
  initializeWand(ownerName: string, creationYear: number): Promise<void>;
  unlockTestSpot(year: number, spotId: number): Promise<void>;
}

export const NFC_STORE_KEY: InjectionKey<NfcStore> = Symbol("nfc-store");

interface WandMetadata {
  creationYear: number;
  name: string;
}

function decodeBytes(data: Uint8Array): string {
  try {
    return new TextDecoder("utf-8").decode(data).trim();
  } catch (error: unknown) {
    if (error instanceof TypeError) return "";
    throw error;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createNfcStore(session: NfcSession = createNfcSession()): NfcStore {
  const isScanning = computed(() => session.state.value === "scanning");
  const isWriting = computed(() => session.state.value === "writing");
  const status = ref("");
  const nfcCompatMessage = ref("");
  const record1Preview = ref("");
  const collectedSpots = ref<Record<number, number[]>>({});
  const wandMetadata = ref<WandMetadata | null>(null);
  const wandDiagnostics = ref<WandDiagnostic[]>([]);

  function updateReadState(records: NfcRecord[]) {
    const normalized = normalizeNfcRecords(records);
    applyDecodedState(normalized, decodeWandRecords(normalized));
    nfcCompatMessage.value = "";
    status.value = t("nfc.detected");
  }

  function applyDecodedState(
    records: ReturnType<typeof normalizeNfcRecords>,
    decoded: ReturnType<typeof decodeWandRecords>,
  ) {
    collectedSpots.value = decoded.hunts;
    wandMetadata.value = decoded.metadata
      ? toUiMetadata(decoded.metadata)
      : null;
    wandDiagnostics.value = decoded.diagnostics;

    const first = records[0];
    record1Preview.value = first
      ? decodeBytes(first.data) || `(${first.recordType})`
      : "";
  }

  function updateWriteState(records: ReturnType<typeof normalizeNfcRecords>) {
    applyDecodedState(records, decodeWandRecords(records));
  }

  function toUiMetadata(metadata: CodecWandMetadata): WandMetadata {
    return {
      creationYear: metadata.creationYear,
      name: metadata.ownerName,
    };
  }

  function applyFailure(reason: NfcFailureReason, error?: Error) {
    switch (reason) {
      case "unsupported":
        nfcCompatMessage.value = t("nfc.not_supported");
        break;
      case "permission-denied":
        nfcCompatMessage.value = t("nfc.permission_denied");
        break;
      case "read-failed":
      case "timeout":
        status.value = t("nfc.read_failed");
        break;
      case "busy":
        status.value = t("nfc.busy");
        break;
      case "cancelled":
        break;
      default:
        status.value = t("nfc.scan_failed", {
          error: error?.message ?? "Unknown NFC error",
        });
    }
  }

  function nfcSupported(): boolean {
    return session.isSupported();
  }

  async function beginScanning(): Promise<ScanResult> {
    const result = await session.startScan({
      onReading: updateReadState,
      onError: applyFailure,
    });

    if (!result.ok) {
      applyFailure(result.reason, result.error);
      if (result.reason === "permission-denied") return "needs-gesture";
      if (result.reason === "busy") return "busy";
      if (result.reason === "unsupported") return "unsupported";
    }

    return "ok";
  }

  async function readTagOnce(prompt: string): Promise<NfcRecord[]> {
    status.value = prompt;
    const result = await session.readOnce();
    if (!result.ok) {
      applyFailure(result.reason, result.error);
      throw new NfcSessionError(result.reason, result.error?.message);
    }
    return result.value;
  }

  async function writeRecords(
    records: ReturnType<typeof normalizeNfcRecords>,
  ): Promise<void> {
    const result = await session.write({
      records: records.map(toNdefRecordInit),
    });
    if (!result.ok) {
      applyFailure(result.reason, result.error);
      throw new NfcSessionError(result.reason, result.error?.message);
    }
  }

  function shouldAbortWrite(): boolean {
    if (!nfcSupported()) {
      nfcCompatMessage.value = t("nfc.unavailable");
      return true;
    }
    if (isWriting.value) return true;

    session.cancel();
    return false;
  }

  async function keepReaderActive(): Promise<void> {
    const result = await beginScanning();
    if (result === "needs-gesture") {
      nfcCompatMessage.value = t("nfc.permission_denied");
    }
  }

  async function writeRecord1(request: ToyRecordWriteRequest): Promise<void> {
    if (shouldAbortWrite()) return;

    status.value = t("nfc.write_verify");

    try {
      const currentRecords = await readTagOnce(t("nfc.write_verify_reading"));
      const plan = buildWandWritePlan(normalizeNfcRecords(currentRecords), {
        kind: "record1",
        record: normalizeNdefRecordInit(buildToyRecord(request)),
      });

      await writeRecords(plan.records);
      updateWriteState(plan.records);
      status.value = t("nfc.write_record1_success");
      void keepReaderActive();
    } catch (error: unknown) {
      status.value = t("nfc.write_record1_failed", {
        error: errorMessage(error),
      });
    }
  }

  async function initializeWand(
    ownerName: string,
    creationYear: number,
  ): Promise<void> {
    if (shouldAbortWrite()) return;

    status.value = t("nfc.init_prompt");

    try {
      const plan = buildInitializationWritePlan(
        normalizeNdefRecordInit({
          recordType: "url",
          data: resolveAppUrl(""),
        }),
        ownerName,
        creationYear,
      );

      await writeRecords(plan.records);
      updateWriteState(plan.records);
      status.value = t("nfc.init_success", {
        name: ownerName,
        year: creationYear,
      });
      void keepReaderActive();
    } catch (error: unknown) {
      status.value = t("nfc.init_failed", { error: errorMessage(error) });
      throw error;
    }
  }

  async function unlockTestSpot(year: number, spotId: number): Promise<void> {
    if (shouldAbortWrite()) return;

    status.value = t("nfc.unlock_prompt", { spot: spotId, year });

    try {
      const currentRecords = await readTagOnce(t("nfc.write_verify_reading"));
      const plan = buildWandWritePlan(normalizeNfcRecords(currentRecords), {
        kind: "spot",
        year,
        spotId,
      });

      await writeRecords(plan.records);
      updateWriteState(plan.records);
      status.value = t("nfc.unlock_success", { spot: spotId, year });
      void keepReaderActive();
    } catch (error: unknown) {
      status.value = t("nfc.unlock_failed", { error: errorMessage(error) });
    }
  }

  return {
    isScanning,
    isWriting,
    status,
    nfcCompatMessage,
    record1Preview,
    collectedSpots,
    wandMetadata,
    wandDiagnostics,
    nfcSupported,
    beginScanning,
    writeRecord1,
    initializeWand,
    unlockTestSpot,
  };
}

export function useNfc(): NfcStore {
  const store = inject(NFC_STORE_KEY);
  if (!store) {
    throw new Error("NFC store is not provided by the application entry point.");
  }
  return store;
}
