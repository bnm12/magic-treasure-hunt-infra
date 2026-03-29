import { ref, computed, onMounted } from "vue";
import type { Ref, ComputedRef } from "vue";
import { loadHunts, type HuntYear } from "../utils/spotLoader";

export interface HuntDataState {
  hunts: Ref<Record<number, HuntYear>>;
  allYears: ComputedRef<number[]>;
  availableSpotIdsByYear: ComputedRef<Record<number, number[]>>;
}

export function useHuntData(): HuntDataState {
  const hunts = ref<Record<number, HuntYear>>({});

  onMounted(async () => {
    hunts.value = await loadHunts();
  });

  // All available years from loaded hunt data, most recent first
  const allYears = computed<number[]>(() =>
    Object.keys(hunts.value)
      .map(Number)
      .sort((a, b) => b - a),
  );

  // Map from year to sorted array of spot IDs for that year
  const availableSpotIdsByYear = computed<Record<number, number[]>>(() => {
    const result: Record<number, number[]> = {};
    for (const year of allYears.value) {
      const hunt = hunts.value[year];
      result[year] = hunt
        ? Object.keys(hunt.spots)
            .map(Number)
            .sort((a, b) => a - b)
        : [];
    }
    return result;
  });

  return { hunts, allYears, availableSpotIdsByYear };
}
