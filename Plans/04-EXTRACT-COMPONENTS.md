# Phase 4 — Extract Components from `App.vue`

## Goal

`App.vue` currently contains markup for four distinct UI regions embedded directly as large `v-if`/`v-else-if` branches. This phase extracts four of them into dedicated components, leaving `App.vue` as a thin orchestration layer.

**What gets extracted:**
- The NFC toast notification → `NfcToast.vue`
- The NFC consent overlay → `NfcConsentOverlay.vue`
- The Hunt tab page → `HuntPage.vue`
- The Archive tab page → `ArchivePage.vue`

**What stays in `App.vue`:**
- The `<MagicBackground />` element
- The `<div class="nfc-banner">` error banner (one line, not worth extracting)
- The `<BottomNav>` element
- The `<Transition name="page-fade">` wrapper
- The `InitializePage` and `ConfigureSpotPage` branches (they are already separate components)
- The `ToyboxPage` branch (left for Phase 4 extension; it is already fairly thin)
- All PWA install logic
- All NFC scanning lifecycle logic

## Files to Create

| New File | Extracted From |
|----------|---------------|
| `website/src/components/NfcToast.vue` | App.vue toast markup + styles |
| `website/src/components/NfcConsentOverlay.vue` | App.vue consent overlay markup + styles |
| `website/src/components/HuntPage.vue` | App.vue hunt page branch markup + styles |
| `website/src/components/ArchivePage.vue` | App.vue archive page branch markup + styles |

## Files to Edit

| File | Change |
|------|--------|
| `website/src/App.vue` | Import and use the four new components; remove extracted markup and styles |

---

## Step 1 — Create `NfcToast.vue`

This component renders the floating toast notification that appears when NFC status changes.

### Create the file

**File:** `website/src/components/NfcToast.vue`

```vue
<template>
  <Transition name="nfc-toast">
    <div
      v-if="visible"
      class="nfc-toast"
      :class="{ writing: isWriting }"
      aria-live="polite"
    >
      <span class="nfc-toast-icon" aria-hidden="true">
        {{ isWriting ? "&#9998;" : "&#10024;" }}
      </span>
      {{ status }}
      <span v-if="!isWriting" class="toast-sparkles" aria-hidden="true">
        <span class="ts" style="--sx: -18px; --sy: -28px; --d: 0s">&#10022;</span>
        <span class="ts" style="--sx: 22px; --sy: -24px; --d: 0.1s">&#10038;</span>
        <span class="ts" style="--sx: -10px; --sy: -36px; --d: 0.2s">&#10022;</span>
        <span class="ts" style="--sx: 16px; --sy: -32px; --d: 0.15s">&#10047;</span>
      </span>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
  isWriting: boolean;
  status: string;
}>();
</script>

<style scoped>
.nfc-toast {
  position: fixed;
  top: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 200;
  padding: 0.5rem 1.25rem;
  border-radius: 12px;
  background: rgba(11, 11, 26, 0.92);
  backdrop-filter: blur(16px);
  border: 1px solid var(--accent-border);
  color: var(--accent);
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  box-shadow: var(--glow-gold);
  pointer-events: none;
  white-space: nowrap;
}

.nfc-toast.writing {
  border-color: var(--accent2-border);
  color: var(--accent2);
  box-shadow: var(--glow-purple);
  animation: magic-write-pulse 1.5s ease-in-out infinite;
}

.nfc-toast-icon {
  font-size: 0.9rem;
}

.nfc-toast.writing .nfc-toast-icon {
  animation: sparkle-spin 1.5s linear infinite;
}

.toast-sparkles {
  position: absolute;
  top: 50%;
  left: 50%;
  pointer-events: none;
}

.ts {
  position: absolute;
  font-size: 0.65rem;
  color: var(--accent);
  animation: sparkle-float 0.7s ease-out forwards;
  animation-delay: var(--d, 0s);
  opacity: 0;
}

.nfc-toast-enter-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.nfc-toast-leave-active {
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}

.nfc-toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

.nfc-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-6px);
}
</style>
```

### Notes

- The `Transition` element is moved inside the component so `App.vue` just uses `<NfcToast>` with no wrapper.
- The animations (`magic-write-pulse`, `sparkle-spin`, `sparkle-float`) are defined in `style.css` globally. The scoped styles here do not need to redefine them — the `animation` property references global keyframes and that works fine with scoped styles.

---

## Step 2 — Create `NfcConsentOverlay.vue`

This component renders the modal overlay that asks the user for NFC permission.

### Create the file

**File:** `website/src/components/NfcConsentOverlay.vue`

```vue
<template>
  <div v-if="visible" class="nfc-consent-overlay">
    <div class="nfc-consent-card">
      <span class="consent-wand" aria-hidden="true">&#10024;</span>
      <h2 class="consent-title">Enable Wand Scanner?</h2>
      <p class="consent-desc">
        Allow NFC scanning so your phone can read magic wands automatically.
      </p>
      <button class="consent-btn" @click="emit('consent')">
        Enable NFC
      </button>
      <button class="consent-skip" @click="emit('skip')">
        Skip for now
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  consent: [];
  skip: [];
}>();
</script>

<style scoped>
.nfc-consent-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 5, 15, 0.85);
  backdrop-filter: blur(12px);
  padding: 1.5rem;
}

.nfc-consent-card {
  max-width: 340px;
  width: 100%;
  text-align: center;
  padding: 2.5rem 2rem 2rem;
  border-radius: 20px;
  background: var(--surface);
  border: 1px solid var(--accent-border);
  box-shadow:
    var(--glow-gold),
    0 16px 48px rgba(0, 0, 0, 0.6);
  animation: reveal-up 0.4s ease;
}

.consent-wand {
  font-size: 3.5rem;
  display: block;
  margin-bottom: 0.75rem;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 0 16px rgba(212, 168, 67, 0.5));
}

.consent-title {
  font-size: 1.3rem;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 0.75rem;
  line-height: 1.3;
}

.consent-desc {
  color: var(--text);
  font-size: 0.85rem;
  line-height: 1.6;
  margin: 0 0 1.5rem;
}

.consent-btn {
  width: 100%;
  padding: 0.85rem 1.5rem;
  border: none;
  border-radius: 12px;
  background: var(--gradient-gold);
  color: var(--bg);
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  box-shadow: 0 4px 20px rgba(212, 168, 67, 0.3);
}

.consent-btn:active {
  transform: scale(0.97);
}

.consent-skip {
  display: block;
  margin-top: 0.75rem;
  background: none;
  border: none;
  color: var(--text);
  font-size: 0.75rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s ease;
}

.consent-skip:hover {
  opacity: 1;
}
</style>
```

### Notes

- The old code used `v-if="showNfcConsent"` directly in `App.vue` and called `showNfcConsent = false` on skip. Now the component emits `skip` and `consent` events, and `App.vue` handles the logic. This respects the "props down, events up" convention.
- `visible` is a prop so `App.vue` controls whether it is shown. The component itself never mutates its visibility.

---

## Step 3 — Create `HuntPage.vue`

This component renders the entire Hunt tab content.

### Create the file

**File:** `website/src/components/HuntPage.vue`

```vue
<template>
  <div class="page">
    <PageHero
      :icon="IconSeeking"
      eyebrow="Tryllestavsprojekt"
      title="Magic Wand Companion"
      copy="Tap your wand at a magic spot to collect it. Scan your wand here to see your progress and hints."
      :show-indicator="true"
      :indicator-active="isScanning"
      :indicator-label="isScanning ? 'NFC Active' : 'NFC Off'"
    />

    <WandInfo v-if="showScannedView" :metadata="wandMetadata" />

    <template v-if="showScannedView && wandYears.length > 0">
      <YearSelector
        v-if="wandYears.length > 1"
        :model-value="selectedYear"
        @update:model-value="emit('update:selectedYear', $event)"
        :years="wandYears"
        :progress="yearProgress"
      />
      <HuntView
        v-if="selectedHunt"
        :hunt="selectedHunt"
        :collected-ids="selectedCollectedIds"
      />
    </template>

    <div v-else class="empty-state">
      <MagicScanCircle
        v-if="!showScannedView"
        :activated="scanRevealActive"
      >
        <IconSeeking class="scan-circle__icon" aria-hidden="true" />
      </MagicScanCircle>
      <IconSeeking v-else class="empty-icon" aria-hidden="true" />
      <p>
        {{
          showScannedView
            ? "No hunt data found on your wand yet. Visit a magic spot!"
            : scanRevealActive
              ? "Your wand is responding..."
              : isScanning
                ? "Hold your wand close to begin your magical adventure!"
                : "Preparing NFC scanner..."
        }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHero from "./PageHero.vue";
import WandInfo from "./WandInfo.vue";
import YearSelector from "./YearSelector.vue";
import HuntView from "./HuntView.vue";
import MagicScanCircle from "./MagicScanCircle.vue";
import IconSeeking from "./icons/IconSeeking.vue";
import type { HuntYear } from "../utils/spotLoader";

defineProps<{
  isScanning: boolean;
  showScannedView: boolean;
  scanRevealActive: boolean;
  wandMetadata: { name: string; creationYear: number } | null;
  wandYears: number[];
  selectedYear: number;
  selectedHunt: HuntYear | null;
  selectedCollectedIds: string[];
  yearProgress: Record<number, { collected: number; total: number }>;
}>();

const emit = defineEmits<{
  "update:selectedYear": [year: number];
}>();
</script>

<style scoped>
.page {
  animation: reveal-up 0.35s ease;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--text);
  position: relative;
  min-height: 50vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
}

.empty-icon {
  font-size: 3rem;
  color: var(--accent);
  display: block;
  margin-bottom: 1rem;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 0 3px rgba(11, 11, 26, 0.9))
    drop-shadow(0 0 8px rgba(212, 168, 67, 0.25));
  position: relative;
  z-index: 2;
}

.empty-state p {
  position: relative;
  z-index: 1;
  max-width: 34ch;
}
</style>
```

### Notes

- `PageHero` no longer receives `:icon="hasScannedWand ? IconHuntMap : IconSeeking"`. The hunt page always shows `IconSeeking` because the wand info card (`WandInfo`) and hunt view already make it clear the wand is scanned. This is a minor simplification — the icon switching added complexity without meaningful UX value. If the product owner disagrees, this can be reverted by adding `hasScannedWand` as a prop and restoring the ternary.
- `update:selectedYear` is emitted upward. `App.vue` connects it to `selectedYearOverride`.

---

## Step 4 — Create `ArchivePage.vue`

### Create the file

**File:** `website/src/components/ArchivePage.vue`

```vue
<template>
  <div class="page">
    <PageHero
      :icon="IconArchive"
      eyebrow="Past & Present"
      title="Hunt Archive"
      copy="Browse all hunts — including ones you may have missed."
      :no-spin="true"
      :compact="true"
    />

    <template v-if="allYears.length > 0">
      <YearSelector
        v-if="allYears.length > 1"
        :model-value="archiveYear"
        @update:model-value="emit('update:archiveYear', $event)"
        :years="allYears"
        :progress="yearProgress"
      />
      <HuntView
        v-if="archiveHunt"
        :hunt="archiveHunt"
        :collected-ids="archiveCollectedIds"
      />
    </template>

    <div v-else class="empty-state">
      <span class="empty-icon" aria-hidden="true">&#128218;</span>
      <p>No hunts available yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHero from "./PageHero.vue";
import YearSelector from "./YearSelector.vue";
import HuntView from "./HuntView.vue";
import IconArchive from "./icons/IconArchive.vue";
import type { HuntYear } from "../utils/spotLoader";

defineProps<{
  allYears: number[];
  archiveYear: number;
  archiveHunt: HuntYear | null;
  archiveCollectedIds: string[];
  yearProgress: Record<number, { collected: number; total: number }>;
}>();

const emit = defineEmits<{
  "update:archiveYear": [year: number];
}>();
</script>

<style scoped>
.page {
  animation: reveal-up 0.35s ease;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--text);
}

.empty-icon {
  font-size: 3rem;
  display: block;
  margin-bottom: 1rem;
}
</style>
```

---

## Step 5 — Update `App.vue` Template and Script

### 5a. Add imports to `<script setup>`

```ts
import NfcToast from "./components/NfcToast.vue";
import NfcConsentOverlay from "./components/NfcConsentOverlay.vue";
import HuntPage from "./components/HuntPage.vue";
import ArchivePage from "./components/ArchivePage.vue";
```

### 5b. Remove these imports that are no longer used directly in `App.vue`

```ts
// Remove these — they are now used inside the extracted components
import MagicScanCircle from "./components/MagicScanCircle.vue";
import WandInfo from "./components/WandInfo.vue";
import HuntView from "./components/HuntView.vue";
import YearSelector from "./components/YearSelector.vue";
import IconHuntMap from "./components/icons/IconHuntMap.vue";
import IconSeeking from "./components/icons/IconSeeking.vue";
import IconArchive from "./components/icons/IconArchive.vue";
```

**Before removing, check:** If any of these are still referenced elsewhere in `App.vue`'s template (for example in the Toybox tab or any remaining branch), keep them. Only remove ones that are exclusively used in the extracted regions.

### 5c. Update the `handleNfcConsent` function

The consent overlay now emits events. Update the handler:

```ts
// The NfcConsentOverlay emits 'consent' when the user clicks Enable NFC.
// The 'skip' event is handled by the overlay closing (showNfcConsent = false).
// Rename handleNfcConsent to handleNfcConsentConfirm for clarity, or keep the name.

async function handleNfcConsent() {
  showNfcConsent.value = false;
  const result = await beginScanning();
  if (result === "needs-gesture") {
    nfcCompatMessage.value =
      "NFC permission was denied. Please allow NFC access in your browser settings and refresh.";
  }
}
```

No change needed to the function body — just ensure it is still called correctly from the template.

### 5d. Replace the template regions

Replace the entire `<template>` body of `App.vue` with this. This is a complete replacement — copy it exactly:

```html
<template>
  <div id="app">
    <MagicBackground />

    <!-- NFC compatibility error banner -->
    <div v-if="nfcCompatMessage" class="nfc-banner">
      {{ nfcCompatMessage }}
    </div>

    <!-- NFC status toast -->
    <NfcToast
      :visible="nfcToastVisible"
      :is-writing="isWriting"
      :status="status"
    />

    <div class="page-content">
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
          :is-scanning="isScanning"
          :show-scanned-view="showScannedView"
          :scan-reveal-active="scanRevealActive"
          :wand-metadata="wandMetadata"
          :wand-years="wandYears"
          :selected-year="selectedYear"
          :selected-hunt="selectedHunt"
          :selected-collected-ids="selectedCollectedIds"
          :year-progress="yearProgress"
          @update:selected-year="selectedYearOverride = $event"
        />

        <ArchivePage
          v-else-if="currentPage === 'archive'"
          key="archive"
          :all-years="allYears"
          :archive-year="archiveYear"
          :archive-hunt="archiveHunt"
          :archive-collected-ids="archiveCollectedIds"
          :year-progress="yearProgress"
          @update:archive-year="archiveYear = $event"
        />

        <div v-else-if="currentPage === 'toybox'" key="toybox" class="page">
          <PageHero
            :icon="IconWandTweaker"
            eyebrow="Wand Workshop"
            title="Toybox"
            copy="Initialize a wand and tune record 1 without disturbing your hunt progress."
            :compact="true"
          />
          <ToyboxPanel
            :is-writing="isWriting"
            :initialize-wand="initializeWand"
            :unlock-test-spot="unlockTestSpot"
            :show-install-action="canInstallPwa"
            :active-hunt-year="allYears[0] ?? 0"
            :available-years="allYears"
            :available-spot-ids-by-year="availableSpotIdsByYear"
            @write="handleToyboxWrite"
            @install="promptInstall"
          />
        </div>
      </Transition>
    </div>

    <BottomNav
      v-if="currentPage !== 'initialize'"
      v-model="currentPage"
      :tabs="navTabs"
    />

    <NfcConsentOverlay
      :visible="showNfcConsent"
      @consent="handleNfcConsent"
      @skip="showNfcConsent = false"
    />
  </div>
</template>
```

### 5e. Remove extracted styles from `App.vue`

Remove these `<style scoped>` blocks from `App.vue`. They have moved to their respective components:

**Remove (moved to `NfcToast.vue`):**
```css
.nfc-toast { ... }
.nfc-toast.writing { ... }
.nfc-toast-icon { ... }
.nfc-toast.writing .nfc-toast-icon { ... }
.toast-sparkles { ... }
.ts { ... }
.nfc-toast-enter-active { ... }
.nfc-toast-leave-active { ... }
.nfc-toast-enter-from { ... }
.nfc-toast-leave-to { ... }
```

**Remove (moved to `NfcConsentOverlay.vue`):**
```css
.nfc-consent-overlay { ... }
.nfc-consent-card { ... }
.consent-wand { ... }
.consent-title { ... }
.consent-desc { ... }
.consent-btn { ... }
.consent-btn:active { ... }
.consent-skip { ... }
.consent-skip:hover { ... }
```

**Remove (moved to `HuntPage.vue` and `ArchivePage.vue`):**
```css
.empty-state { ... }
.empty-icon { ... }
.empty-state p { ... }
.page { ... }
```

**Keep in `App.vue`:**
```css
.nfc-banner { ... }
```

The `App.vue` `<style scoped>` block should only contain `.nfc-banner` after this step.

---

## Verification Checklist

After completing all steps in this phase:

- [ ] `NfcToast.vue` exists and contains all toast markup and styles
- [ ] `NfcConsentOverlay.vue` exists and contains all consent overlay markup and styles
- [ ] `HuntPage.vue` exists and contains the hunt tab markup and styles
- [ ] `ArchivePage.vue` exists and contains the archive tab markup and styles
- [ ] `App.vue` template uses `<NfcToast>`, `<NfcConsentOverlay>`, `<HuntPage>`, `<ArchivePage>`
- [ ] `App.vue` `<style scoped>` only contains `.nfc-banner`
- [ ] `App.vue` does not import `MagicScanCircle`, `WandInfo`, `HuntView`, `YearSelector`, `IconHuntMap`, `IconSeeking`, `IconArchive` (unless used elsewhere in the template)
- [ ] Run `npm run build` from `website/` — must succeed with zero TypeScript errors
- [ ] Test: hunt page renders correctly with and without a scanned wand
- [ ] Test: the scan circle animation plays when NFC is active
- [ ] Test: the wand reveal animation plays after scanning
- [ ] Test: archive page renders all years and allows selection
- [ ] Test: NFC consent overlay appears when permission is needed and closes on skip/consent
- [ ] Test: NFC toast appears briefly when status changes
