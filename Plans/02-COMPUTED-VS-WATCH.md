# Phase 2 — Replace Incorrect `watch` Usage with `computed`

## Goal

Fix three files where reactive `watch` calls are used to synchronize state that could be expressed as `computed` properties. This makes the data flow clearer, eliminates unnecessary reactive triggers, and removes mutable intermediate `ref`s.

**The rule of thumb used here:**
- Use `computed` when the value is *derived from* other reactive state and has no side effects.
- Use `watch` when you need to *react to* a change with a side effect (timer, network call, DOM mutation, etc.).

## Files to Touch

| File | Changes |
|------|---------|
| `website/src/components/ConfigureSpotPage.vue` | `availableSpots` ref+watch → computed |
| `website/src/components/ToyboxPanel.vue` | 3 initialization watches → computed defaults; 3 error-clearing watches → inline clearing |
| `website/src/App.vue` | `wandYears` watch + `selectedYear` → computed-with-fallback pattern |

---

## Step 1 — `ConfigureSpotPage.vue`: `availableSpots`

### Problem

The current code uses a `ref` and a `watch` to keep `availableSpots` in sync with `deviceHuntYear`:

```ts
// CURRENT — remove this
const availableSpots = ref<number[]>([]);

watch(deviceHuntYear, (year) => {
  if (year && hunts.value[year]) {
    availableSpots.value = Object.keys(hunts.value[year].spots)
      .map(Number)
      .sort((a, b) => a - b);
  } else {
    availableSpots.value = [];
  }
});
```

`availableSpots` is always derived directly from `deviceHuntYear` and `hunts`. There is no side effect. This is a textbook `computed`.

### Change

Remove the `availableSpots` ref declaration and the `watch(deviceHuntYear, ...)` block entirely.

Add this computed in their place (alongside the other computeds near the top of `<script setup>`):

```ts
const availableSpots = computed<number[]>(() => {
  const hunt = hunts.value[deviceHuntYear.value];
  if (!hunt) return [];
  return Object.keys(hunt.spots)
    .map(Number)
    .sort((a, b) => a - b);
});
```

### What to verify

- `availableSpots` is still used in the template's `<select>` for spot ID — confirm the template loop `v-for="id in availableSpots"` still works (it will, because `computed` returns a ref-like value).
- The watch on `deviceHuntYear` that called `updateSpot` / reset the spot ID is gone — this is intentional. The `deviceSpotId` field being out of range is handled by the select defaulting to "Select Spot" when the value is 0.

---

## Step 2 — `ToyboxPanel.vue`: Replace Initialization Watches

### Problem

Three `watch` calls with `{ immediate: true }` are used to set initial values for local `ref`s. Immediate watches are initialization logic disguised as reactive logic.

#### Watch A — `wandCreationYear` initialization

```ts
// CURRENT — remove this
watch(
  [() => props.activeHuntYear, () => props.availableYears],
  ([activeHuntYear, availableYears]) => {
    const preferredYear =
      activeHuntYear && availableYears.includes(activeHuntYear)
        ? activeHuntYear
        : (availableYears[0] ?? 0);

    if (preferredYear > 0 && !availableYears.includes(wandCreationYear.value)) {
      wandCreationYear.value = preferredYear;
    }
  },
  { immediate: true },
);
```

#### Watch B — `debugYear` initialization

```ts
// CURRENT — remove this
watch(
  () => props.availableYears,
  (years) => {
    if (years.length > 0 && !years.includes(debugYear.value)) {
      debugYear.value = years[0];
    }
  },
  { immediate: true },
);
```

#### Watch C — `debugSpotId` initialization

```ts
// CURRENT — remove this
watch(
  availableSpotIds,
  (spotIds) => {
    if (spotIds.length === 0) {
      debugSpotId.value = 0;
      return;
    }

    if (!spotIds.includes(debugSpotId.value)) {
      debugSpotId.value = spotIds[0];
    }
  },
  { immediate: true },
);
```

Also remove `availableSpotIds` computed (it was only used to drive Watch C and in the template — we will handle it differently below):

```ts
// CURRENT — remove this
const availableSpotIds = computed(
  () => props.availableSpotIdsByYear[debugYear.value] ?? [],
);
```

### Change

The correct pattern here is: keep a `ref` for the *user's explicit choice* and derive the *effective value* via `computed`, falling back to the first available option.

Replace all of the above with these four computed properties. Add them after the existing `selectedActionDefinition` computed:

```ts
// The year the user has explicitly selected for wand initialization (0 = no explicit choice)
const wandCreationYearOverride = ref<number>(0);

// Effective wand creation year: user's choice if valid, else prefer activeHuntYear, else first available
const wandCreationYear = computed<number>(() => {
  if (
    wandCreationYearOverride.value > 0 &&
    props.availableYears.includes(wandCreationYearOverride.value)
  ) {
    return wandCreationYearOverride.value;
  }
  if (
    props.activeHuntYear > 0 &&
    props.availableYears.includes(props.activeHuntYear)
  ) {
    return props.activeHuntYear;
  }
  return props.availableYears[0] ?? 0;
});

// The year the user has explicitly selected for debug unlock (0 = no explicit choice)
const debugYearOverride = ref<number>(0);

// Effective debug year: user's choice if valid, else first available
const debugYear = computed<number>(() => {
  if (
    debugYearOverride.value > 0 &&
    props.availableYears.includes(debugYearOverride.value)
  ) {
    return debugYearOverride.value;
  }
  return props.availableYears[0] ?? 0;
});

// All spot IDs available for the currently selected debug year
const availableSpotIds = computed<number[]>(
  () => props.availableSpotIdsByYear[debugYear.value] ?? [],
);

// The spot ID the user has explicitly selected for debug unlock (0 = no explicit choice)
const debugSpotIdOverride = ref<number>(0);

// Effective debug spot ID: user's choice if valid, else first available
const debugSpotId = computed<number>(() => {
  if (
    debugSpotIdOverride.value > 0 &&
    availableSpotIds.value.includes(debugSpotIdOverride.value)
  ) {
    return debugSpotIdOverride.value;
  }
  return availableSpotIds.value[0] ?? 0;
});
```

### Update the template bindings

The `<select>` elements that used `v-model="wandCreationYear"`, `v-model="debugYear"`, and `v-model="debugSpotId"` must now bind to the *override* refs (because computed properties are read-only):

Find the select for wand creation year and change:
```html
<!-- BEFORE -->
<select v-model.number="wandCreationYear" id="wand-creation-year" class="nfc-input">

<!-- AFTER -->
<select :value="wandCreationYear" @change="wandCreationYearOverride = +($event.target as HTMLSelectElement).value" id="wand-creation-year" class="nfc-input">
```

Find the select for debug year and change:
```html
<!-- BEFORE -->
<select v-model.number="debugYear" id="debug-year" class="nfc-input">

<!-- AFTER -->
<select :value="debugYear" @change="debugYearOverride = +($event.target as HTMLSelectElement).value" id="debug-year" class="nfc-input">
```

Find the select for debug spot and change:
```html
<!-- BEFORE -->
<select v-model.number="debugSpotId" id="debug-spot" class="nfc-input">

<!-- AFTER -->
<select :value="debugSpotId" @change="debugSpotIdOverride = +($event.target as HTMLSelectElement).value" id="debug-spot" class="nfc-input">
```

### Update `handleInitWand` and `handleUnlockSpot`

These functions reference `wandCreationYear.value` and `debugYear.value` / `debugSpotId.value`. Since these are now `computed` refs, `.value` access still works identically — **no change needed** to those functions.

---

## Step 3 — `ToyboxPanel.vue`: Remove Error-Clearing Watches

### Problem

Three watches exist solely to clear error messages when inputs change:

```ts
// CURRENT — remove all three of these
watch(wandName, () => {
  wandInitError.value = "";
});

watch(
  toyFields,
  () => {
    validationError.value = "";
  },
  { deep: true },
);

watch([debugYear, debugSpotId], () => {
  debugUnlockError.value = "";
});
```

These watches are noisy and fire on every keystroke. The correct approach is to clear the error at the start of the handler that produces it — which is already partially the case (`wandInitError.value = ""` is already the first line of `handleInitWand`).

### Change

Remove all three watch blocks above.

Then add clearing lines to these handlers:

**`handleWrite`** — add `validationError.value = ""` at the top (it is already there, keep it):
```ts
function handleWrite() {
  validationError.value = ""; // already present, keep it
  ...
}
```

**`handleInitWand`** — add `wandInitError.value = ""` at the top (it is already there, keep it):
```ts
async function handleInitWand() {
  wandInitError.value = ""; // already present, keep it
  ...
}
```

**`handleUnlockSpot`** — add `debugUnlockError.value = ""` at the top (it is already there, keep it):
```ts
async function handleUnlockSpot() {
  debugUnlockError.value = ""; // already present, keep it
  ...
}
```

No new code is needed — the handlers already clear the errors. Removing the watches is the entire change.

---

## Step 4 — `App.vue`: Clean Up `selectedYear` Auto-Selection

### Problem

The current code uses a `watch` to auto-select the first year whenever `wandYears` changes:

```ts
// CURRENT — remove this watch
watch(wandYears, (years) => {
  if (years.length > 0 && !years.includes(selectedYear.value)) {
    selectedYear.value = years[0];
  }
});
```

And `selectedYear` is initialized to `0`:

```ts
const selectedYear = ref(0);
```

The template then uses `selectedYear` directly in `YearSelector` (`v-model="selectedYear"`) and to derive `selectedHunt` and `selectedCollectedIds`.

The problem: `selectedYear` starts at `0`, the watch fires asynchronously after `wandYears` first resolves, and during that window `selectedHunt` is `null` (because `hunts.value[0]` is undefined). The `YearSelector` receives `modelValue=0` which matches no year tab. This creates a brief invalid state.

### Change

#### A. Replace `selectedYear` ref and its watch

Remove:
```ts
const selectedYear = ref(0);

watch(wandYears, (years) => {
  if (years.length > 0 && !years.includes(selectedYear.value)) {
    selectedYear.value = years[0];
  }
});
```

Add these two declarations in their place:

```ts
// Tracks the user's explicit year selection. 0 means "no explicit choice yet".
const selectedYearOverride = ref<number>(0);

// The effective selected year: use override if it's in the available list,
// otherwise fall back to the first wand year, otherwise 0.
const selectedYear = computed<number>(() => {
  if (
    selectedYearOverride.value > 0 &&
    wandYears.value.includes(selectedYearOverride.value)
  ) {
    return selectedYearOverride.value;
  }
  return wandYears.value[0] ?? 0;
});
```

#### B. Update the `YearSelector` binding in the template

Find the `YearSelector` inside the hunt page section. It currently uses `v-model="selectedYear"`. Since `selectedYear` is now a computed (read-only), change it to use the override ref:

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

#### C. Verify downstream computeds still work

`selectedHunt` and `selectedCollectedIds` both read `selectedYear.value`. Since `selectedYear` is now a computed ref, `.value` access is identical. **No changes needed to these computeds.**

#### D. Do NOT change `archiveYear`

`archiveYear` has its own initialization in `onMounted`:
```ts
if (allYears.value.length > 0) {
  archiveYear.value = allYears.value[0];
}
```
This is fine as-is and is out of scope for this step.

---

## Verification Checklist

After completing all steps in this phase:

- [ ] `ConfigureSpotPage.vue` has no `watch(deviceHuntYear, ...)` block
- [ ] `ConfigureSpotPage.vue` `availableSpots` is declared with `computed`, not `ref`
- [ ] `ToyboxPanel.vue` has no `watch` blocks for `wandName`, `toyFields`, or `[debugYear, debugSpotId]`
- [ ] `ToyboxPanel.vue` has no `watch` blocks with `{ immediate: true }` for year/spot initialization
- [ ] `ToyboxPanel.vue` `wandCreationYear`, `debugYear`, `debugSpotId` are all `computed`
- [ ] `ToyboxPanel.vue` `wandCreationYearOverride`, `debugYearOverride`, `debugSpotIdOverride` exist as `ref<number>(0)`
- [ ] `App.vue` has no `watch(wandYears, ...)` block
- [ ] `App.vue` `selectedYear` is declared with `computed`, not `ref`
- [ ] `App.vue` `selectedYearOverride` exists as `ref<number>(0)`
- [ ] `YearSelector` in hunt tab uses `:model-value` + `@update:model-value` instead of `v-model`
- [ ] Run `npm run build` from `website/` — must succeed with no TypeScript errors
- [ ] Test: open the app, scan a wand, confirm the correct year tab is selected automatically
- [ ] Test: manually switch year tabs, confirm selection persists
- [ ] Test: open Toybox, confirm year dropdowns show a valid default selection
