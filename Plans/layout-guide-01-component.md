# PageLayout Implementation Guide
## Part 1 of 3: Create the PageLayout Component

---

## Before You Begin — Read This Completely

This guide refactors the layout system across the entire Vue app. You will create one new component and then update existing files to use it. The work must be done in order. Do not skip steps.

**After every file you modify, verify the app still renders correctly using Playwright:**

```bash
cd website
npm run dev
# In a separate terminal, run your Playwright check
```

Use Playwright to take a screenshot after each major change and visually confirm:
- The page renders (not blank)
- The hero title is visible
- Content is not overflowing horizontally
- The bottom nav is visible

If the page goes blank or throws a console error, fix it before continuing.

---

## Understanding the Current Problem

Right now layout responsibility is split across many files:

| What | Where it lives now |
|---|---|
| NFC error banner | `App.vue` template + scoped styles |
| NfcToast | `App.vue` template |
| PageHero | Duplicated in every page component |
| Content max-width | Different value in every page (`500px`, `600px`, none) |
| Content padding | Different in every page |
| Bottom nav spacing | `style.css` `.page-content` padding-bottom |

This causes:
- Pages having different content widths
- The NFC banner being full-viewport-width with no content alignment to the rest of the page
- Long Danish strings causing the banner to reflow and shift layout
- Near-identical `<PageHero .../>` lines copy-pasted into every page component

**After this refactor**, all of the above lives in one place: `PageLayout.vue`.

---

## Step 1 — Understand What PageLayout Will Render

`PageLayout.vue` renders this structure every time it is used:

```
┌─────────────────────────────────────────┐  ← full viewport width
│  [NFC error banner]  (optional)         │  sticky, full width
├─────────────────────────────────────────┤
│  [NfcToast]          (floating)         │  fixed position, always present
├─────────────────────────────────────────┤
│                                         │
│   ┌─────────────────────────────────┐   │  ← max-width: 680px, centered
│   │  [PageHero]    (optional)       │   │
│   ├─────────────────────────────────┤   │
│   │  [slot]  page content goes here │   │
│   └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

The NFC banner spans full width (correct — it is a system-level warning).
Everything else is constrained to `max-width: 680px` centered.

---

## Step 2 — Create PageLayout.vue

Create the file `website/src/components/PageLayout.vue` with the exact content below.

Read through it fully before pasting. Notes follow after the code block explaining the key decisions.

```vue
<template>
  <div class="page-layout">

    <!-- NFC compatibility error banner — full width, sticky -->
    <!-- Hidden on pages that don't need it (e.g. ConfigureSpotPage) -->
    <div
      v-if="showNfcBanner && nfcCompatMessage"
      class="nfc-banner"
      role="alert"
    >
      <span class="nfc-banner__text">{{ nfcCompatMessage }}</span>
    </div>

    <!-- NFC status toast — floating, always mounted so transitions work -->
    <NfcToast
      :visible="nfcToastVisible"
      :is-writing="isWriting"
      :status="nfcStatus"
    />

    <!-- Constrained content column -->
    <div class="page-layout__column">

      <!-- PageHero — only rendered when heroTitle is provided -->
      <PageHero
        v-if="heroTitle"
        :icon="heroIcon!"
        :eyebrow="heroEyebrow ?? ''"
        :title="heroTitle"
        :copy="heroCopy"
        :compact="heroCompact"
        :no-spin="heroNoSpin"
        :show-indicator="heroShowIndicator"
        :indicator-active="heroIndicatorActive"
        :indicator-label="heroIndicatorLabel"
      />

      <!-- Page-specific content -->
      <div class="page-layout__content">
        <slot />
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue";
import NfcToast from "./NfcToast.vue";
import PageHero from "./PageHero.vue";

withDefaults(
  defineProps<{
    // ── NFC banner ──────────────────────────────────────────────────────
    nfcCompatMessage: string;
    /** Set to false on pages where the NFC banner is irrelevant (ConfigureSpotPage) */
    showNfcBanner?: boolean;

    // ── NfcToast ─────────────────────────────────────────────────────────
    nfcToastVisible: boolean;
    isWriting: boolean;
    nfcStatus: string;

    // ── PageHero — all optional ──────────────────────────────────────────
    // The hero is only rendered when heroTitle is provided.
    // If heroTitle is omitted, no hero appears and no empty space is reserved.
    heroIcon?: Component;
    heroEyebrow?: string;
    heroTitle?: string;
    heroCopy?: string;
    heroCompact?: boolean;
    heroNoSpin?: boolean;
    heroShowIndicator?: boolean;
    heroIndicatorActive?: boolean;
    heroIndicatorLabel?: string;
  }>(),
  {
    showNfcBanner: true,
    heroCompact: false,
    heroNoSpin: false,
    heroShowIndicator: false,
    heroIndicatorActive: false,
  }
);
</script>

<style scoped>
/* ── Outer wrapper ─────────────────────────────────────────────────────── */
.page-layout {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  width: 100%;
}

/* ── NFC banner ────────────────────────────────────────────────────────── */
/*
  Spans the full viewport width so it reads as a system-level alert.
  The text inside is constrained to the same max-width as the content
  column so it aligns visually with the rest of the page.
  Using word-break + overflow-wrap prevents long Danish strings from
  causing horizontal scroll or layout shift.
*/
.nfc-banner {
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  padding: 0.6rem 1rem;
  background: rgba(248, 113, 113, 0.12);
  border-bottom: 1px solid rgba(248, 113, 113, 0.3);
  backdrop-filter: blur(12px);
  box-sizing: border-box;
}

.nfc-banner__text {
  display: block;
  max-width: 680px;
  margin: 0 auto;
  color: var(--danger);
  font-size: 0.8rem;
  text-align: center;
  word-break: normal;
  overflow-wrap: break-word;
  white-space: normal;
}

/* ── Constrained content column ────────────────────────────────────────── */
/*
  Single canonical content width for the entire app.
  All pages render their content inside this column.
  The 5rem bottom padding gives space for the fixed BottomNav.
*/
.page-layout__column {
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
  box-sizing: border-box;
  padding: 0 0 5rem;
}

/* ── Inner content area ─────────────────────────────────────────────────── */
/*
  Horizontal padding lives here so the PageHero (which manages its own
  internal padding) sits flush edge-to-edge while slot content is inset.
  Exception: HuntView has its own 1rem padding on its root element — that
  is fine because it renders inside this container.
*/
.page-layout__content {
  padding: 0 1rem;
}
</style>
```

### Key decisions explained

**Why `v-if="heroTitle"` not a boolean prop?**
Every page already knows whether it wants a hero. Tying the render to `heroTitle` being present avoids adding a separate `showHero` boolean that would always be set in sync with `heroTitle` anyway.

**Why `heroIcon!` with a non-null assertion?**
When `heroTitle` is provided, `heroIcon` should always be provided too. The `v-if="heroTitle"` guard means `PageHero` only renders when `heroTitle` is set. In practice callers always pass both. The assertion avoids a TypeScript error without adding runtime overhead.

**Why `padding: 0 0 5rem` on `.page-layout__column` and `padding: 0 1rem` on `.page-layout__content`?**
`PageHero` manages its own internal padding (`1.5rem 1rem 1.1rem`). If we put horizontal padding on the column, the hero gets double-padded. So horizontal padding only applies to the content slot, not the column wrapper.

**Why `max-width: 680px`?**
This replaces the inconsistent values scattered across pages:
- `InitializePage` had `500px` — too narrow, form fields felt cramped
- `ConfigureSpotPage` had `600px`  
- `HuntPage` / `ArchivePage` had no constraint at all
- `ToyboxPanel` used `padding: 0 1.5rem` with no max-width

680px is wide enough for the hunt spot grid at tablet size, comfortable on 390px phones, and consistent everywhere.

---

## Step 3 — Verify the component file compiles

Run a build to confirm no TypeScript errors in the new file:

```bash
cd website
npm run build
```

**Expected:** Build passes. Nothing in the app uses `PageLayout` yet — you have only created the file. No visual change is expected.

**If the build fails:** Check for typos in the `withDefaults(defineProps<...>())` block. The most common error is a missing `?` on an optional prop.

---

## Step 4 — Use Playwright to confirm the app is unchanged

Start the dev server and take a baseline screenshot:

```bash
cd website
npm run dev
```

Use Playwright to navigate to the app and screenshot all three tabs (Hunt, Archive, Toybox). Save these as your baseline. You will compare against them after each subsequent step.

The screenshots at this point should look **exactly the same as before** — you have only created a new file, nothing uses it yet.

---

## Checklist Before Moving to Part 2

- [ ] `src/components/PageLayout.vue` exists
- [ ] `npm run build` passes
- [ ] Playwright baseline screenshots saved for Hunt, Archive, and Toybox tabs
- [ ] No visual change compared to before

**Do not proceed to Part 2 until all boxes are checked.**
