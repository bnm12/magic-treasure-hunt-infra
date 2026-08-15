import { computed, onMounted, ref } from "vue";
import type { ComputedRef, Ref } from "vue";
import {
  getSpotIdsForYear,
  loadHuntCatalog,
  type HuntDiagnostic,
  type HuntYear,
} from "../utils/huntCatalog";

export interface HuntCatalogError {
  code: "load-failed" | "spot-index-failed";
  message: string;
  year?: number;
  cause?: unknown;
}

export interface HuntDataState {
  hunts: Ref<Record<number, HuntYear>>;
  catalogYears: ComputedRef<number[]>;
  uiYears: ComputedRef<number[]>;
  availableSpotIdsByYear: ComputedRef<Record<number, number[]>>;
  isLoading: Ref<boolean>;
  diagnostics: Ref<HuntDiagnostic[]>;
  error: Ref<HuntCatalogError | null>;
}

const hunts = ref<Record<number, HuntYear>>({});
const catalogYearsState = ref<number[]>([]);
const spotIdsByYearState = ref<Record<number, number[]>>({});
const isLoading = ref(true);
const diagnostics = ref<HuntDiagnostic[]>([]);
const error = ref<HuntCatalogError | null>(null);

let loaded = false;
let loadPromise: Promise<void> | null = null;

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

async function loadSharedHuntData(): Promise<void> {
  if (loaded) return;
  if (loadPromise) return loadPromise;

  isLoading.value = true;
  error.value = null;
  loadPromise = (async () => {
    const snapshot = await loadHuntCatalog();
    hunts.value = snapshot.hunts;
    catalogYearsState.value = [...snapshot.years];
    diagnostics.value = [...snapshot.diagnostics];

    const spotIdsByYear = await Promise.all(
      snapshot.years.map(async (year) => {
        try {
          return { year, ids: [...(await getSpotIdsForYear(year))] };
        } catch (cause) {
          error.value = {
            code: "spot-index-failed",
            message: `Spot index for hunt ${year} could not be loaded`,
            year,
            cause,
          };
          return { year, ids: [] };
        }
      }),
    );

    spotIdsByYearState.value = Object.fromEntries(
      spotIdsByYear.map(({ year, ids }) => [year, ids]),
    );
    loaded = true;
  })()
    .catch((cause) => {
      const normalized = toError(cause);
      error.value = {
        code: "load-failed",
        message: normalized.message,
        cause,
      };
    })
    .finally(() => {
      isLoading.value = false;
      loadPromise = null;
    });

  return loadPromise;
}

export function useHuntData(): HuntDataState {
  const catalogYears = computed<number[]>(() => catalogYearsState.value);
  const uiYears = computed<number[]>(() =>
    [...catalogYears.value].sort((a, b) => b - a),
  );
  const availableSpotIdsByYear = computed<Record<number, number[]>>(
    () => spotIdsByYearState.value,
  );

  onMounted(() => {
    void loadSharedHuntData();
  });

  return {
    hunts,
    catalogYears,
    uiYears,
    availableSpotIdsByYear,
    isLoading,
    diagnostics,
    error,
  };
}
