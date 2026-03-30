# PageLayout Implementation Guide
## Part 2 of 3: Update App.vue, ManagementApp.vue, and All Page Components

---

## Before You Begin

- Part 1 must be complete and `npm run build` must be passing.
- You must have Playwright baseline screenshots from Part 1.
- Work through this part in the exact order given. Each section builds on the previous one.

---

## Overview of Changes in This Part

You will update files in this order:

1. `App.vue` — remove NFC banner, NfcToast, and per-page PageHero calls; pass layout props to pages
2. `HuntPage.vue` — remove PageHero, wrap content in PageLayout
3. `ArchivePage.vue` — remove PageHero, wrap content in PageLayout
4. The Toybox inline section in `App.vue` — wrap in PageLayout
5. `ManagementApp.vue` — mirror App.vue's pattern exactly
6. `InitializePage.vue` — remove PageHero and scoped max-width styles, wrap in PageLayout
7. `ConfigureSpotPage.vue` — same, plus set `showNfcBanner=false`
8. `ToyboxPanel.vue` — remove its own padding (now owned by PageLayout)

---

## Critical Rule for This Entire Part

**PageLayout replaces the page-level wrapper div in every page component.**

Before:
```vue
<template>
  <div class="some-page page">
    <PageHero ... />
    <!-- content -->
  </div>
</template>
```

After:
```vue
<template>
  <PageLayout ...layoutProps>
    <!-- content (no PageHero here — it moved to PageLayout props) -->
  </PageLayout>
</template>
```

The `<PageLayout>` element IS the root element. There is no extra wrapping div.

---

## Section 1 — Update App.vue

This is the most involved change. Read the full section before editing.

### What App.vue currently does (layout-related)

1. Renders `<MagicBackground />` — stays, not a layout concern
2. Renders `<div v-if="nfcCompatMessage" class="nfc-banner">` — **moves into PageLayout**
3. Renders `<NfcToast .../>` — **moves into PageLayout**
4. Renders `<div class="page-content">` with `<Transition>` inside — **stays, but simplified**
5. Each page inside the Transition renders its own `<PageHero>` — **moves into PageLayout**
6. Renders `<BottomNav .../>` — stays, it is fixed position
7. Renders `<NfcConsentOverlay .../>` — stays, it is a full-screen modal

### What the Toybox page currently looks like in App.vue template

```html
<div v-else-if="currentPage === 'toybox'" key="toybox" class="page">
  <PageHero
    :icon="IconWandTweaker"
    :eyebrow="t('toybox.eyebrow')"
    :title="t('toybox.title')"
    :copy="t('toybox.copy')"
    :compact="true"
  />
  <ToyboxPanel ... />
</div>
```

This inline page div in App.vue also gets converted to use PageLayout.

### The new App.vue template structure

The Transition now contains three `<PageLayout>` usages — one per tab. The NFC banner and NfcToast are no longer direct children of `#app`.

Here is the complete new `<template>` block for `App.vue`. Replace the entire existing template:

```html
<template>
  <div id="app">
    <MagicBackground />

    <div class="page-content">
      <Transition name="page-fade" mode="out-in">

        <PageLayout
          v-if="currentPage === 'hunt'"
          key="hunt"
          :nfc-compat-message="nfcCompatMessage"
          :nfc-toast-visible="nfcToastVisible"
          :is-writing="isWriting"
          :nfc-status="status"
          :hero-icon="IconSeeking"
          :hero-eyebrow="t('hunt.eyebrow')"
          :hero-title="t('hunt.title')"
          :hero-copy="t('hunt.copy')"
          :hero-show-indicator="true"
          :hero-indicator-active="isScanning"
          :hero-indicator-label="isScanning ? t('nfc.indicator_active') : t('nfc.indicator_inactive')"
        >
          <HuntPage
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
        </PageLayout>

        <PageLayout
          v-else-if="currentPage === 'archive'"
          key="archive"
          :nfc-compat-message="nfcCompatMessage"
          :nfc-toast-visible="nfcToastVisible"
          :is-writing="isWriting"
          :nfc-status="status"
          :hero-icon="IconArchive"
          :hero-eyebrow="t('archive.eyebrow')"
          :hero-title="t('archive.title')"
          :hero-copy="t('archive.copy')"
          :hero-no-spin="true"
          :hero-compact="true"
        >
          <ArchivePage
            :all-years="allYears"
            :archive-year="archiveYear"
            :archive-hunt="archiveHunt"
            :archive-collected-ids="archiveCollectedIds"
            :year-progress="yearProgress"
            @update:archive-year="archiveYear = $event"
          />
        </PageLayout>

        <PageLayout
          v-else-if="currentPage === 'toybox'"
          key="toybox"
          :nfc-compat-message="nfcCompatMessage"
          :nfc-toast-visible="nfcToastVisible"
          :is-writing="isWriting"
          :nfc-status="status"
          :hero-icon="IconWandTweaker"
          :hero-eyebrow="t('toybox.eyebrow')"
          :hero-title="t('toybox.title')"
          :hero-copy="t('toybox.copy')"
          :hero-compact="true"
        >
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
        </PageLayout>

      </Transition>
    </div>

    <BottomNav v-model="currentPage" :tabs="navTabs" />

    <NfcConsentOverlay
      :visible="showNfcConsent"
      @consent="handleNfcConsent"
      @skip="showNfcConsent = false"
    />
  </div>
</template>
```

### Add PageLayout and missing icon imports to App.vue script

In the `<script setup>` block, add these imports alongside the existing component imports:

```typescript
import PageLayout from "./components/PageLayout.vue";
import IconArchive from "./components/icons/IconArchive.vue";
import IconSeeking from "./components/icons/IconSeeking.vue";
```

Note: `IconArchive` and `IconSeeking` were previously only imported inside `HuntPage.vue` and `ArchivePage.vue`. Now that the hero is declared in `App.vue`, these icons are passed as props from here.

Also add two new locale keys to the `nfc` section of both locale files. These are for the NFC indicator label in the hunt hero:

**In `en.json`**, add to the `"nfc"` section:
```json
"indicator_active": "NFC Active",
"indicator_inactive": "NFC Off"
```

**In `da.json`**, add to the `"nfc"` section:
```json
"indicator_active": "NFC Aktiv",
"indicator_inactive": "NFC Fra"
```

### Remove from App.vue script

Remove the import of `NfcToast` — it is now imported inside `PageLayout.vue`:
```typescript
// Remove this line:
import NfcToast from "./components/NfcToast.vue";
```

Remove the `nfcToastVisible` ref and the `toastTimer` and the `watch(status, ...)` block that manages toast visibility — **wait, do not remove these yet**. `PageLayout` receives `nfcToastVisible` as a prop, and that value must still come from somewhere. Keep the toast visibility logic in App.vue. You are only moving the `<NfcToast>` element into `PageLayout`; the state that drives it stays in `App.vue`.

### Remove from App.vue scoped styles

Delete the entire `.nfc-banner` CSS rule from `<style scoped>` in `App.vue`. It now lives in `PageLayout.vue`.

Also remove the `.page-content` rule if it exists in scoped styles — but check first: `.page-content` is defined in `style.css` globally. If there is a duplicate in `App.vue` scoped styles, remove the scoped one. If it only exists in `style.css`, leave it alone.

### Playwright check after App.vue

Use Playwright to screenshot all three tabs. Compare to baseline.

**What should look the same:** General layout, hero appearance, content visibility, bottom nav.

**What may look slightly different (expected):** Content width may have changed — previously Hunt and Archive had no max-width. Confirm content is centered and not overflowing. If text wraps differently due to the new 680px constraint that is correct behavior.

**What must not happen:** Blank page, console errors, missing hero, missing nav.

---

## Section 2 — Update HuntPage.vue

HuntPage previously owned its `<PageHero>` and the `class="page"` wrapper. Both move out.

### What to remove from HuntPage.vue

**Remove from template:**
- The `<PageHero .../>` element entirely (it is now declared in App.vue via PageLayout)
- The outer `<div class="page">` wrapper — PageLayout is now the root

**Remove from script:**
- `import PageHero from "./PageHero.vue";`
- The PageHero prop types from `defineProps` — `heroEyebrow`, `heroTitle`, etc. are gone

**Remove from scoped styles:**
- The `.page { animation: reveal-up 0.35s ease; }` rule — this animation moves to PageLayout

**Remove from defineProps:**

The props that were passing hero data into HuntPage from App.vue no longer exist. Specifically remove:
- Nothing in the current HuntPage props are hero-related — the hero was hardcoded inside HuntPage, not passed as props. So you only need to remove the `<PageHero>` element and its import.

### What HuntPage.vue looks like after changes

The template root becomes the content that was previously inside the `<div class="page">`, minus the PageHero:

```html
<template>
  <div>
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
            ? t('hunt.empty_no_data')
            : scanRevealActive
              ? t('hunt.empty_responding')
              : isScanning
                ? t('hunt.empty_scanning')
                : t('hunt.empty_preparing')
        }}
      </p>
    </div>
  </div>
</template>
```

Notice the root is now a plain `<div>` — not `<div class="page">`. The `reveal-up` animation that was on `.page` will be moved to PageLayout's enter transition in Part 3.

### Playwright check after HuntPage.vue

Screenshot the Hunt tab. Confirm:
- Hero is still visible (it now comes from PageLayout via App.vue)
- WandInfo card appears correctly when wand is scanned
- Empty state with scan circle appears when no wand is scanned
- No extra blank space above content

---

## Section 3 — Update ArchivePage.vue

Same pattern as HuntPage.

### What to remove from ArchivePage.vue

**Remove from template:**
- `<PageHero .../>` element
- The outer `<div class="page">` wrapper

**Remove from script:**
- `import PageHero from "./PageHero.vue";`
- `import IconArchive from "./icons/IconArchive.vue";` — only needed if used elsewhere in ArchivePage; check before removing. In the current code IconArchive is only used in the PageHero call, so remove it.

**Remove from scoped styles:**
- `.page { animation: reveal-up 0.35s ease; }` rule

### What ArchivePage.vue template looks like after

```html
<template>
  <div>
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
      <p>{{ t('archive.empty') }}</p>
    </div>
  </div>
</template>
```

### Playwright check after ArchivePage.vue

Screenshot the Archive tab. Confirm hero is visible and content renders correctly.

---

## Section 4 — Update ManagementApp.vue

`ManagementApp.vue` must mirror `App.vue`'s structure exactly. It has two pages: Initialize and ConfigureSpot.

### The new ManagementApp.vue template

Replace the entire template:

```html
<template>
  <div id="management-app">
    <MagicBackground />

    <div class="page-content">
      <Transition name="page-fade" mode="out-in">

        <PageLayout
          v-if="currentTab === 'initialize'"
          key="initialize"
          :nfc-compat-message="nfcCompatMessage"
          :nfc-toast-visible="false"
          :is-writing="isWriting"
          :nfc-status="''"
          :hero-icon="IconWandTweaker"
          :hero-eyebrow="t('init_page.eyebrow')"
          :hero-title="t('init_page.title')"
          :hero-copy="t('init_page.copy', { year: currentYear })"
          :hero-compact="true"
        >
          <InitializePage
            :year="currentYear"
            :is-writing="isWriting"
            :initialize-wand="initializeWand"
          />
        </PageLayout>

        <PageLayout
          v-else-if="currentTab === 'configureSpot'"
          key="configureSpot"
          :nfc-compat-message="nfcCompatMessage"
          :show-nfc-banner="false"
          :nfc-toast-visible="false"
          :is-writing="false"
          :nfc-status="''"
          :hero-icon="IconWand"
          :hero-eyebrow="t('configure_page.eyebrow')"
          :hero-title="t('configure_page.title')"
          :hero-copy="t('configure_page.copy')"
          :hero-compact="true"
        >
          <ConfigureSpotPage />
        </PageLayout>

      </Transition>
    </div>

    <BottomNav v-model="currentTab" :tabs="tabs" />
  </div>
</template>
```

### Add imports to ManagementApp.vue script

```typescript
import PageLayout from "./components/PageLayout.vue";
import { useI18n } from "vue-i18n";
const { t } = useI18n();
```

Ensure `MagicBackground`, `InitializePage`, `ConfigureSpotPage`, `BottomNav`, `IconWandTweaker`, `IconWand` are all still imported — they were already there, just verify none were accidentally removed.

### Remove from ManagementApp.vue

Remove the `<div v-if="nfcCompatMessage" class="nfc-banner">` element from the template if it existed. Check the original — in the codebase snapshot ManagementApp.vue did not have an NFC banner. If it is absent, nothing to remove.

Remove `import NfcToast` if it existed in ManagementApp.vue — it did not in the original, so nothing to do.

### Note on `nfc-toast-visible="false"` and `nfc-status="''"`

The management app does not have toast-driven NFC status feedback in the same way the main app does. Passing static `false` and `''` is correct — the toast will never appear. If a future version needs toast support here, those values can be wired to reactive state then.

### Playwright check after ManagementApp.vue

Navigate to `/management/` and screenshot both tabs. Confirm:
- Initialize Wand tab shows hero and form
- Configure Spot tab shows hero and connection UI
- No NFC banner on Configure Spot tab
- NFC banner is present (but empty/hidden) on Initialize Wand tab

---

## Section 5 — Update InitializePage.vue

InitializePage previously had its own `<PageHero>` and `max-width: 500px` styling.

### What to remove from InitializePage.vue

**Remove from template:**
- The `<PageHero .../>` element
- The outer `<div class="initialize-page page">` wrapper

**Remove from script:**
- `import PageHero from "./PageHero.vue";`
- `import IconWandTweaker from "./icons/IconWandTweaker.vue";` — only if it was used solely for PageHero. Check: in the original, it was only used in the PageHero call inside InitializePage. Remove it.

**Remove from scoped styles:**
- The entire `.initialize-page` rule: `padding: 0 1.5rem 2rem; max-width: 500px; margin: 0 auto;`
- These values are now owned by PageLayout's `.page-layout__column` and `.page-layout__content`

### What InitializePage.vue template root looks like after

```html
<template>
  <div>
    <NfcConsentOverlay
      :visible="showNfcConsent"
      @consent="handleNfcConsent"
      @skip="showNfcConsent = false"
    />

    <div class="initialize-content glass-card">
      <!-- form contents unchanged -->
    </div>

    <div class="history-section" v-if="history.length > 0">
      <!-- history unchanged -->
    </div>
  </div>
</template>
```

### Playwright check after InitializePage.vue

Navigate to `/management/`. Screenshot the Initialize Wand tab. Confirm:
- Form is visible and inset from screen edges
- Max-width constraint is visible (content doesn't span full width on tablet)
- Hero appears (it comes from ManagementApp.vue via PageLayout)

---

## Section 6 — Update ConfigureSpotPage.vue

ConfigureSpotPage had `max-width: 600px` and its own PageHero.

### What to remove from ConfigureSpotPage.vue

**Remove from template:**
- The `<PageHero .../>` element
- The outer `<div class="configure-spot-page page">` wrapper

**Remove from script:**
- `import PageHero from "./PageHero.vue";`
- `import IconWandTweaker from "./icons/IconWandTweaker.vue";` — verify it was only used in PageHero here, then remove

**Remove from scoped styles:**
- The `.configure-spot-page` rule: `padding: 0 1.5rem 2rem; max-width: 600px; margin: 0 auto;`

### What ConfigureSpotPage.vue template root looks like after

```html
<template>
  <div class="configure-content glass-card">
    <!-- all existing content unchanged -->
  </div>
</template>
```

Note: the root is now the `.configure-content.glass-card` div directly. There is no wrapper div needed because PageLayout's content slot provides the container.

### Why showNfcBanner is false for ConfigureSpotPage

The Configure Spot page uses Web Serial and Web Bluetooth to talk to hardware. The NFC compatibility banner is irrelevant on this page — the user is connecting via USB or BT, not tapping wands. Showing the banner would confuse hardware operators. This is already handled by `show-nfc-banner="false"` in the ManagementApp.vue PageLayout call from Section 4.

### Playwright check after ConfigureSpotPage.vue

Navigate to `/management/` and click Configure Spot. Confirm:
- No NFC banner visible
- Hero is visible
- Connect USB / Connect Bluetooth buttons are visible
- Content is properly constrained (not full viewport width)

---

## Section 7 — Update ToyboxPanel.vue

ToyboxPanel previously had `padding: 0 1.5rem 1.5rem` on its root `.toybox-panel` element. This padding is now redundant — `PageLayout`'s `.page-layout__content` provides `padding: 0 1rem`, and the extra `0.5rem` difference is not worth the inconsistency.

### What to change in ToyboxPanel.vue

**In scoped styles**, find:

```css
.toybox-panel {
  padding: 0 1.5rem 1.5rem;
}
```

Change to:

```css
.toybox-panel {
  padding: 0;
}
```

That is the only change in ToyboxPanel. The component keeps its root `<section class="toybox-panel">` element — PageLayout's slot wraps it, providing the padding.

### Playwright check after ToyboxPanel.vue

Screenshot the Toybox tab. Confirm:
- Content is properly inset (has horizontal padding from PageLayout)
- The glass cards within ToyboxPanel are not touching the screen edges
- Consistent with Hunt and Archive tab padding

---

## Final build check for Part 2

Run:

```bash
cd website
npm run build
```

The build must pass with zero errors before you continue to Part 3.

---

## Checklist Before Moving to Part 3

- [ ] `App.vue` template uses `<PageLayout>` for all three tabs
- [ ] `App.vue` has no `<NfcToast>` in its template (moved to PageLayout)
- [ ] `App.vue` has no `.nfc-banner` in its scoped styles (moved to PageLayout)
- [ ] `App.vue` still has the toast visibility state and watch (the logic stays, only the element moved)
- [ ] `HuntPage.vue` has no `<PageHero>` and no outer `.page` div
- [ ] `ArchivePage.vue` has no `<PageHero>` and no outer `.page` div
- [ ] `ManagementApp.vue` uses `<PageLayout>` for both tabs
- [ ] `ManagementApp.vue` mirrors `App.vue`'s structure
- [ ] `InitializePage.vue` has no `<PageHero>` and no `max-width`/`padding` scoped styles
- [ ] `ConfigureSpotPage.vue` has no `<PageHero>` and no `max-width`/`padding` scoped styles
- [ ] `ToyboxPanel.vue` padding changed to `0`
- [ ] `en.json` and `da.json` have `nfc.indicator_active` and `nfc.indicator_inactive` keys
- [ ] `npm run build` passes

**Do not proceed to Part 3 until all boxes are checked.**
