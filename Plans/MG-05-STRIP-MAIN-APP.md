# MG-05 — Strip Management Pages from the Main App

## Goal

Remove the Initialize Wand and Configure Spot pages from the main consumer app (`App.vue`). These pages now live exclusively in the management app. The main app should have no awareness of them.

This phase also cleans up everything in `App.vue` that only existed to support those pages.

---

## Files to Edit

| File | Change |
|------|--------|
| `website/src/App.vue` | Remove initialize/configureSpot branches and all supporting code |

If Phase 3 of the refactor guide has been applied, `useRouter.ts` exists and owns the page routing logic. In that case, edits span two files:

| File | Change |
|------|--------|
| `website/src/composables/useRouter.ts` | Remove initialize/configureSpot routing |
| `website/src/App.vue` | Remove initialize/configureSpot branches from template |

**Read this entire document before making any changes.** The instructions cover both cases.

---

## Case A: Refactor Phase 3 HAS been applied (`useRouter.ts` exists)

### Step A1 — Edit `useRouter.ts`

Open `website/src/composables/useRouter.ts`.

The current file contains routing logic for `initialize` and `configureSpot`. Here is the full current file for reference:

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
  });

  return { currentPage, initializeYear };
}
```

Replace the entire file with this trimmed version:

```ts
import { ref, onMounted } from "vue";

export type PageName = "hunt" | "archive" | "toybox";

export function useRouter() {
  const currentPage = ref<PageName>("hunt");

  // No URL-based routing needed for the main app.
  // The initialize and configureSpot pages have moved to /management/.

  return { currentPage };
}
```

### What changed in `useRouter.ts`

- `PageName` type now only includes the three main app pages: `"hunt"`, `"archive"`, `"toybox"`
- `initializeYear` ref is removed (no longer needed)
- The `onMounted` block is removed entirely (the URL detection for `?initialize` and `?configureSpot` is no longer needed)
- The `RouterState` interface is removed (use inferred return type instead)

### Step A2 — Edit `App.vue` template

Open `website/src/App.vue`. Find the `<Transition name="page-fade" mode="out-in">` block.

The current template (after Phase 4 of the refactor guide) looks like:

```html
<Transition name="page-fade" mode="out-in">
  <InitializePage
    v-if="currentPage === 'initialize'"
    key="initialize"
    :year="initializeYear"
    :is-writing="isWriting"
    :initialize-wand="initializeWand"
  />

  <ConfigureSpotPage
    v-else-if="currentPage === 'configureSpot'"
    key="configureSpot"
  />

  <HuntPage
    v-else-if="currentPage === 'hunt'"
    key="hunt"
    ...
  />

  <ArchivePage
    v-else-if="currentPage === 'archive'"
    key="archive"
    ...
  />

  <div v-else-if="currentPage === 'toybox'" key="toybox" class="page">
    ...
  </div>
</Transition>
```

Remove the `InitializePage` branch and the `ConfigureSpotPage` branch. The result should be:

```html
<Transition name="page-fade" mode="out-in">
  <HuntPage
    v-else-if="currentPage === 'hunt'"
    key="hunt"
    ...
  />

  <ArchivePage
    v-else-if="currentPage === 'archive'"
    key="archive"
    ...
  />

  <div v-else-if="currentPage === 'toybox'" key="toybox" class="page">
    ...
  </div>
</Transition>
```

Wait — after removing the first `v-if`, the remaining branches use `v-else-if`. The first remaining branch must change from `v-else-if` to `v-if`:

```html
<Transition name="page-fade" mode="out-in">
  <HuntPage
    v-if="currentPage === 'hunt'"
    key="hunt"
    ...
  />

  <ArchivePage
    v-else-if="currentPage === 'archive'"
    key="archive"
    ...
  />

  <div v-else-if="currentPage === 'toybox'" key="toybox" class="page">
    ...
  </div>
</Transition>
```

### Step A3 — Remove `BottomNav` condition

The `BottomNav` currently has a condition to hide itself on the initialize page:

```html
<BottomNav
  v-if="currentPage !== 'initialize'"
  v-model="currentPage"
  :tabs="navTabs"
/>
```

Since `initialize` is no longer a valid page, simplify this to:

```html
<BottomNav
  v-model="currentPage"
  :tabs="navTabs"
/>
```

### Step A4 — Remove unused imports from `App.vue`

Check the `<script setup>` imports. Remove these if present (they are no longer referenced in the template):

```ts
// Remove these imports from App.vue
import InitializePage from "./components/InitializePage.vue";
import ConfigureSpotPage from "./components/ConfigureSpotPage.vue";
```

Also remove `initializeYear` from the `useRouter()` destructuring if it was there:

```ts
// BEFORE (if refactor was applied)
const { currentPage, initializeYear } = useRouter();

// AFTER
const { currentPage } = useRouter();
```

### Step A5 — Remove `initializeYear` from `useNfc` pass-through (if applicable)

If `App.vue` currently passes `initializeYear` as a prop to `InitializePage`, that prop binding is gone. No other component uses `initializeYear`, so there is nothing else to update.

---

## Case B: Refactor Phase 3 has NOT been applied (`useRouter.ts` does not exist)

In this case, the routing logic is directly in `App.vue`'s `onMounted`.

### Step B1 — Remove routing logic from `onMounted` in `App.vue`

Find `onMounted` in `App.vue`. It currently contains a block like:

```ts
onMounted(async () => {
  // ... other setup ...

  // Remove these lines:
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
  } else if (
    url.pathname.endsWith("/configureSpot") ||
    url.pathname.endsWith("/configureSpot/") ||
    url.searchParams.has("configureSpot")
  ) {
    currentPage.value = "configureSpot";
  }

  // ... rest of onMounted ...
});
```

Remove only the URL detection block. Leave the rest of `onMounted` intact.

### Step B2 — Remove `initializeYear` ref from `App.vue`

Find and remove:

```ts
const initializeYear = ref(new Date().getFullYear());
```

### Step B3 — Remove `currentPage` type values

Find the `currentPage` ref declaration:

```ts
const currentPage = ref("hunt");
```

This does not need to change — it defaults to `"hunt"` which is still correct.

If a `PageName` type is defined inline in `App.vue`, remove `"initialize"` and `"configureSpot"` from it:

```ts
// BEFORE
type PageName = "hunt" | "archive" | "toybox" | "initialize" | "configureSpot";

// AFTER
type PageName = "hunt" | "archive" | "toybox";
```

### Step B4 — Follow Steps A2, A3, A4 from Case A above

The template changes (remove branches, fix `v-if`, remove BottomNav condition, remove imports) are identical regardless of whether `useRouter.ts` exists. Apply steps A2, A3, and A4.

---

## Both Cases: Remove `navTabs` entries

Find `navTabs` in `App.vue`. It currently defines the bottom navigation tabs:

```ts
const navTabs: NavTab[] = [
  { id: "hunt", label: "Hunt", icon: IconHuntMap },
  { id: "archive", label: "Archive", icon: IconArchive },
  { id: "toybox", label: "Toybox", icon: IconWandTweaker },
];
```

The `initialize` and `configureSpot` pages were never in `navTabs` (they were accessed via URL, not navigation). So **no change is needed** to `navTabs`.

---

## Verification Checklist

After completing all steps in this phase:

- [ ] `App.vue` template has no `InitializePage` component
- [ ] `App.vue` template has no `ConfigureSpotPage` component
- [ ] `App.vue` template's first branch inside `<Transition>` uses `v-if` (not `v-else-if`)
- [ ] `App.vue` template's `<BottomNav>` has no `v-if` condition
- [ ] `App.vue` does not import `InitializePage` or `ConfigureSpotPage`
- [ ] `App.vue` (or `useRouter.ts`) no longer reads `?initialize` or `?configureSpot` from the URL
- [ ] `initializeYear` ref no longer exists in `App.vue` or `useRouter.ts`
- [ ] If `useRouter.ts` exists: `PageName` type only includes `"hunt"`, `"archive"`, `"toybox"`
- [ ] Run `npm run build` — must succeed with zero TypeScript errors
- [ ] In dev: navigate to `/` — the hunt page loads with no initialize/configureSpot page available
- [ ] In dev: navigate to `/?initialize` — the main app loads normally (query param ignored), does NOT show initialize page
- [ ] In dev: navigate to `/?configureSpot` — same, loads main app normally
- [ ] In dev: navigate to `/management/` — management app loads correctly with both tools
- [ ] In dev: the main app bottom nav shows exactly three tabs: Hunt, Archive, Toybox
