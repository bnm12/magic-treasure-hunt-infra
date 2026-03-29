# Phase 3 — Extract Composables from `App.vue`

## Goal

`App.vue` currently contains four distinct logical concerns mixed together: URL-based routing, hunt data loading, year selection state, and wand scan reveal animation. Each will be extracted into its own composable file so `App.vue` only orchestrates them.

**Important:** This phase only moves code. No logic changes, no new features. If you find yourself writing new algorithms, stop and re-read the guide.

## Files to Create

| New File | Extracted From |
|----------|---------------|
| `website/src/composables/useRouter.ts` | `App.vue` `onMounted` routing block |
| `website/src/composables/useWandReveal.ts` | `App.vue` `scanRevealActive` / `scanRevealComplete` / timer |
| `website/src/composables/useHuntData.ts` | `App.vue` `hunts`, `allYears`, `availableSpotIdsByYear` |
| `website/src/composables/useYearSelection.ts` | `App.vue` `wandYears`, `selectedYear`, `archiveYear`, `yearProgress` |

## Files to Edit

| File | Change |
|------|--------|
| `website/src/App.vue` | Import and use the four new composables; remove extracted code |

---

## Step 1 — Create `useRouter.ts`

### What it does

Reads the current URL on mount and returns the current page name and any route parameters. This replaces the routing block inside `App.vue`'s `onMounted`.

### Create the file

**File:** `website/src/composables/useRouter.ts`

```ts
import { ref, onMounted } from "vue";

export type PageName = "hunt" | "archive" | "toybox" | "initialize" | "configureSpot";

export interface RouterState {
  currentPage: ReturnType<typeof ref<PageName>>;
  initializeYear: ReturnType<typeof ref<number>>;
}

export function useRouter(): RouterState {
  const currentPage = ref<PageName>("hunt");
  const initializeYear = ref<number>(new Date().getFullYear());

  onMounted(() => {
    const url = new URL(window.location.href);

    if (
      url.pathname.endsWith("/initialize") ||
      url.pathname.endsWith("/initialize/") ||
      url.searchParams.has("initialize")
    ) {
      currentPage.value = "initialize";
      const yearParam = url.searchParams.get("year");
      if (yearParam) {
        const year = parseInt(yearParam, 10);
        if (!isNaN(year)) {
          initializeYear.value = year;
        }
      }
      return;
    }

    if (
      url.pathname.endsWith("/configureSpot") ||
      url.pathname.endsWith("/configureSpot/") ||
      url.searchParams.has("configureSpot")
    ) {
      currentPage.value = "configureSpot";
      return;
    }

    // Default page is "hunt"; no change needed
  });

  return { currentPage, initializeYear };
}
```

### Notes

- This composable uses `onMounted` internally, so it must be called at the top level of a component's `<script setup>` (which `App.vue` is).
- The `currentPage` ref is returned so the bottom nav's `v-model="currentPage"` binding still works.
- `initializeYear` is returned so `InitializePage` can receive it as a prop.

---

## Step 2 — Create `useWandReveal.ts`

### What it does

Encapsulates the 900ms delay animation that plays when a wand is first scanned. It watches the "has wand" signal and manages the two boolean flags used to sequence the reveal.

### Create the file

**File:** `website/src/composables/useWandReveal.ts`

```ts
import { ref, watch, onBeforeUnmount } from "vue";
import type { Ref } from "vue";

export interface WandRevealState {
  scanRevealActive: Ref<boolean>;
  showScannedView: Ref<boolean>;
}

/**
 * Manages the wand-scan reveal animation.
 *
 * When `hasWand` transitions from false to true, a 900ms animation plays
 * (scanRevealActive = true), after which the full scanned view is shown
 * (showScannedView = true). When `hasWand` goes back to false, both reset.
 *
 * @param hasWand - A reactive boolean indicating whether a wand has been scanned.
 */
export function useWandReveal(hasWand: Ref<boolean>): WandRevealState {
  const scanRevealActive = ref(false);
  const showScannedView = ref(false);
  let revealTimer: ReturnType<typeof setTimeout> | undefined;

  watch(hasWand, (scanned) => {
    clearTimeout(revealTimer);

    if (!scanned) {
      scanRevealActive.value = false;
      showScannedView.value = false;
      return;
    }

    scanRevealActive.value = true;
    showScannedView.value = false;
    revealTimer = setTimeout(() => {
      scanRevealActive.value = false;
      showScannedView.value = true;
    }, 900);
  });

  onBeforeUnmount(() => {
    clearTimeout(revealTimer);
  });

  return { scanRevealActive, showScannedView };
}
```

### Notes

- `hasWand` is passed in as a `Ref<boolean>` rather than computed inside the composable. This keeps the composable decoupled from NFC internals — it only cares about a boolean signal.
- The `onBeforeUnmount` cleanup replaces the cleanup that was previously in `App.vue`'s `onBeforeUnmount`.
- `showScannedView` replaces `scanRevealComplete` from the old code. Rename to be more descriptive about what it controls (whether to show the full scanned view).

---

## Step 3 — Create `useHuntData.ts`

### What it does

Calls `loadHunts()` and exposes the loaded data as reactive state. Also derives `allYears` and `availableSpotIdsByYear`.

### Create the file

**File:** `website/src/composables/useHuntData.ts`

```ts
import { ref, computed, onMounted } from "vue";
import { loadHunts, type HuntYear } from "../utils/spotLoader";

export interface HuntDataState {
  hunts: ReturnType<typeof ref<Record<number, HuntYear>>>;
  allYears: ReturnType<typeof computed<number[]>>;
  availableSpotIdsByYear: ReturnType<typeof computed<Record<number, number[]>>>;
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
```

### Notes

- `loadHunts()` is called in `onMounted` (not at module level) so that it only runs in a browser context, not during SSR or test environments.
- `hunts` starts as an empty object `{}`, so all derived computeds gracefully return empty arrays until loading completes.

---

## Step 4 — Create `useYearSelection.ts`

### What it does

Manages year selection for the Hunt tab and Archive tab. Takes `collectedSpots`, `hunts`, and `allYears` as reactive inputs and returns all the derived values that feed the UI.

### Create the file

**File:** `website/src/composables/useYearSelection.ts`

```ts
import { ref, computed, watch } from "vue";
import type { Ref } from "vue";
import type { HuntYear } from "../utils/spotLoader";

export interface YearSelectionState {
  // Hunt tab
  wandYears: ReturnType<typeof computed<number[]>>;
  selectedYear: ReturnType<typeof computed<number>>;
  selectedYearOverride: Ref<number>;
  selectedHunt: ReturnType<typeof computed<HuntYear | null>>;
  selectedCollectedIds: ReturnType<typeof computed<string[]>>;

  // Archive tab
  archiveYear: Ref<number>;
  archiveHunt: ReturnType<typeof computed<HuntYear | null>>;
  archiveCollectedIds: ReturnType<typeof computed<string[]>>;

  // Shared
  yearProgress: ReturnType<typeof computed<Record<number, { collected: number; total: number }>>>;
}

export function useYearSelection(
  collectedSpots: Ref<Record<number, number[]>>,
  hunts: Ref<Record<number, HuntYear>>,
  allYears: ReturnType<typeof computed<number[]>>,
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
```

### Notes

- The `archiveYear` watch with `{ immediate: true }` is correct here — it has a true side effect (it sets the default year when data arrives) and `archiveYear` is a user-driven ref that the user can override.
- `selectedYearOverride` is exposed so the `YearSelector` component can write to it via `@update:model-value`.

---

## Step 5 — Update `App.vue` to Use the New Composables

This step removes the code from `App.vue` that was extracted into the composables and replaces it with calls to those composables.

### 5a. Add imports

At the top of `<script setup>` in `App.vue`, add these imports:

```ts
import { useRouter } from "./composables/useRouter";
import { useWandReveal } from "./composables/useWandReveal";
import { useHuntData } from "./composables/useHuntData";
import { useYearSelection } from "./composables/useYearSelection";
```

### 5b. Remove these declarations from `App.vue`

Remove each of the following from `<script setup>`. The composables now own them.

**Remove these refs:**
```ts
const currentPage = ref("hunt");           // → useRouter
const initializeYear = ref(new Date().getFullYear());  // → useRouter
const scanRevealActive = ref(false);       // → useWandReveal
const scanRevealComplete = ref(false);     // → useWandReveal (now showScannedView)
const hunts = ref<Record<number, HuntYear>>({});  // → useHuntData
const selectedYearOverride = ref<number>(0);  // → useYearSelection
const archiveYear = ref(0);               // → useYearSelection
```

**Remove these computeds:**
```ts
const allYears = computed(...)             // → useHuntData
const wandYears = computed(...)            // → useYearSelection
const selectedYear = computed(...)         // → useYearSelection
const selectedHunt = computed(...)         // → useYearSelection
const archiveHunt = computed(...)         // → useYearSelection
const selectedCollectedIds = computed(...) // → useYearSelection
const archiveCollectedIds = computed(...)  // → useYearSelection
const yearProgress = computed(...)         // → useYearSelection
const availableSpotIdsByYear = computed(...) // → useHuntData
const hasScannedWand = computed(...)       // keep — it's not extracted
const showScannedView = computed(...)      // → useWandReveal (now returned directly)
```

**Remove these watches:**
```ts
watch(() => hasScannedWand.value, ...)     // → useWandReveal (internal)
watch(wandYears, ...)                      // → useYearSelection (handled by computed)
```

**Remove from `onMounted`:**
```ts
// Remove these lines from onMounted (the routing block):
const url = new URL(window.location.href);
if (url.pathname.endsWith("/initialize") || ...) { ... }
else if (url.pathname.endsWith("/configureSpot") || ...) { ... }

// Remove this line from onMounted (hunt loading):
hunts.value = await loadHunts();

// Remove this line from onMounted (archive year init):
if (allYears.value.length > 0) { archiveYear.value = allYears.value[0]; }
```

**Remove from `onBeforeUnmount`:**
```ts
clearTimeout(scanRevealTimer);  // → useWandReveal handles its own cleanup
```

Also remove `let scanRevealTimer: ReturnType<typeof setTimeout> | undefined;`.

### 5c. Add composable calls

Replace the removed declarations with these composable calls. Place them right after the `useNfc()` call:

```ts
// Routing
const { currentPage, initializeYear } = useRouter();

// Hunt data
const { hunts, allYears, availableSpotIdsByYear } = useHuntData();

// Wand reveal animation
const hasScannedWand = computed(
  () => wandMetadata.value !== null || Object.keys(collectedSpots.value).length > 0,
);
const { scanRevealActive, showScannedView } = useWandReveal(hasScannedWand);

// Year selection
const {
  wandYears,
  selectedYear,
  selectedYearOverride,
  selectedHunt,
  selectedCollectedIds,
  archiveYear,
  archiveHunt,
  archiveCollectedIds,
  yearProgress,
} = useYearSelection(collectedSpots, hunts, allYears);
```

### 5d. Remove `loadHunts` import if no longer used

If `loadHunts` was only used in the `onMounted` block (which is now gone), remove it from the import line:

```ts
// BEFORE
import { loadHunts } from "./utils/spotLoader";
import type { HuntYear } from "./utils/spotLoader";

// AFTER — only keep what's still used in App.vue
import type { HuntYear } from "./utils/spotLoader";
```

If `HuntYear` is also no longer referenced directly in `App.vue`, remove it too.

### 5e. Update the `YearSelector` binding in the template

The hunt tab `YearSelector` must now use the override ref from the composable:

```html
<!-- BEFORE -->
<YearSelector
  v-if="wandYears.length > 1"
  v-model="selectedYear"
  :years="wandYears"
  :progress="yearProgress"
/>

<!-- AFTER -->
<YearSelector
  v-if="wandYears.length > 1"
  :model-value="selectedYear"
  @update:model-value="selectedYearOverride = $event"
  :years="wandYears"
  :progress="yearProgress"
/>
```

### 5f. Verify `onMounted` is still correct

After all removals, `onMounted` in `App.vue` should only contain:

```ts
onMounted(async () => {
  updateStandaloneState();
  window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.addEventListener("appinstalled", handleAppInstalled);

  if (!nfcSupported()) {
    nfcCompatMessage.value =
      "Web NFC is not available. Open this page in Chrome on Android over HTTPS.";
  } else {
    const result = await beginScanning();
    if (result === "needs-gesture") {
      showNfcConsent.value = true;
    }
  }
});
```

If there are any remaining lines from the removed routing/loading blocks, delete them.

### 5g. Verify `onBeforeUnmount` is still correct

After removals, `onBeforeUnmount` in `App.vue` should only contain:

```ts
onBeforeUnmount(() => {
  window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  window.removeEventListener("appinstalled", handleAppInstalled);
});
```

The `clearTimeout(toastTimer)` for the NFC toast may still be there if it was not extracted — keep it if present.

---

## Verification Checklist

After completing all steps in this phase:

- [ ] `website/src/composables/useRouter.ts` exists
- [ ] `website/src/composables/useWandReveal.ts` exists
- [ ] `website/src/composables/useHuntData.ts` exists
- [ ] `website/src/composables/useYearSelection.ts` exists
- [ ] `App.vue` `<script setup>` does not contain: `currentPage`, `initializeYear`, `scanRevealActive`, `scanRevealComplete`, `hunts`, `allYears`, `wandYears`, `selectedHunt`, `archiveHunt`, `yearProgress`, `availableSpotIdsByYear` as direct declarations (they come from composables)
- [ ] `App.vue` `onMounted` does not contain the routing if/else block or `loadHunts()` call
- [ ] `App.vue` `onBeforeUnmount` does not contain `clearTimeout(scanRevealTimer)`
- [ ] `App.vue` imports all four new composables
- [ ] Run `npm run build` from `website/` — must succeed with zero TypeScript errors
- [ ] Test: app loads and shows the hunt page by default
- [ ] Test: navigating to `?initialize` shows the initialize page
- [ ] Test: scanning a wand triggers the reveal animation and then shows hunt progress
- [ ] Test: the archive tab shows years and allows year selection
