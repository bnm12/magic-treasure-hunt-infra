import { ref, computed, watch } from "vue";
import type { Ref, ComputedRef } from "vue";
import type { HuntYear } from "../utils/spotLoader";

export interface YearSelectionState {
  // Hunt tab
  wandYears: ComputedRef<number[]>;
  selectedYear: ComputedRef<number>;
  selectedYearOverride: Ref<number>;
  selectedHunt: ComputedRef<HuntYear | null>;
  selectedCollectedIds: ComputedRef<string[]>;

  // Archive tab
  archiveYear: Ref<number>;
  archiveHunt: ComputedRef<HuntYear | null>;
  archiveCollectedIds: ComputedRef<string[]>;

  // Shared
  yearProgress: ComputedRef<Record<number, { collected: number; total: number }>>;
}

export function useYearSelection(
  collectedSpots: Ref<Record<number, number[]>>,
  hunts: Ref<Record<number, HuntYear>>,
  allYears: ComputedRef<number[]>,
): YearSelectionState {
  // ── Hunt tab ─────────────────────────────────────────────────────────────

  // Years to show on the hunt tab: years on the wand that have hunt data,
  // plus always the latest available hunt year (even if not yet collected).
  const wandYears = computed<number[]>(() => {
    const onWand = Object.keys(collectedSpots.value).map(Number);
    const years = onWand.filter((y) => y in hunts.value);
    if (allYears.value.length > 0 && !years.includes(allYears.value[0])) {
      years.push(allYears.value[0]);
    }
    return years.sort((a, b) => b - a);
  });

  // The user's explicit year choice. 0 means "no explicit choice".
  const selectedYearOverride = ref<number>(0);

  // Effective selected year: use override if valid, else fall back to first wand year.
  const selectedYear = computed<number>(() => {
    if (
      selectedYearOverride.value > 0 &&
      wandYears.value.includes(selectedYearOverride.value)
    ) {
      return selectedYearOverride.value;
    }
    return wandYears.value[0] ?? 0;
  });

  const selectedHunt = computed<HuntYear | null>(
    () => hunts.value[selectedYear.value] ?? null,
  );

  const selectedCollectedIds = computed<string[]>(() =>
    (collectedSpots.value[selectedYear.value] ?? []).map(String),
  );

  // ── Archive tab ──────────────────────────────────────────────────────────

  // Archive year is driven by user selection only; defaults to most recent year
  // when hunt data first loads.
  const archiveYear = ref<number>(0);

  watch(allYears, (years) => {
    if (years.length > 0 && archiveYear.value === 0) {
      archiveYear.value = years[0];
    }
  }, { immediate: true });

  const archiveHunt = computed<HuntYear | null>(
    () => hunts.value[archiveYear.value] ?? null,
  );

  const archiveCollectedIds = computed<string[]>(() =>
    (collectedSpots.value[archiveYear.value] ?? []).map(String),
  );

  // ── Shared ───────────────────────────────────────────────────────────────

  const yearProgress = computed<Record<number, { collected: number; total: number }>>(() => {
    const result: Record<number, { collected: number; total: number }> = {};
    for (const year of allYears.value) {
      const hunt = hunts.value[year];
      const total = hunt ? Object.keys(hunt.spots).length : 0;
      const collectedIds = (collectedSpots.value[year] ?? []).filter(
        (id) => hunt && String(id) in hunt.spots,
      );
      result[year] = { collected: collectedIds.length, total };
    }
    return result;
  });

  return {
    wandYears,
    selectedYear,
    selectedYearOverride,
    selectedHunt,
    selectedCollectedIds,
    archiveYear,
    archiveHunt,
    archiveCollectedIds,
    yearProgress,
  };
}
