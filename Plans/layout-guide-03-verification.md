# PageLayout Implementation Guide
## Part 3 of 3: Cleanup, Animation, and Full Verification

---

## Before You Begin

- Parts 1 and 2 must be complete and `npm run build` must be passing.

---

## What This Part Covers

1. Move the `reveal-up` page animation into PageLayout
2. Clean up now-unused CSS in `style.css`
3. Fix the `page-content` scroll container
4. Full visual verification with Playwright across all pages and both languages
5. Regression checklist

---

## Step 1 — Move the page entry animation into PageLayout

Previously, each page component had this in its scoped styles:

```css
.page {
  animation: reveal-up 0.35s ease;
}
```

Since the `.page` wrapper div has been removed from every page component, this animation no longer fires. The entry animation now belongs in `PageLayout` — it should fire on the layout itself, not on individual page content divs.

### Add the animation to PageLayout.vue

In `PageLayout.vue`, add to `<style scoped>`:

```css
/* Entry animation — fires when PageLayout mounts (i.e. when the tab changes) */
.page-layout {
  animation: reveal-up 0.35s ease;
}
```

The `reveal-up` keyframe is defined in `style.css` globally, so it is available here without redeclaring it.

### Why this works correctly

`App.vue` uses `<Transition name="page-fade" mode="out-in">` wrapping the three `<PageLayout>` elements. When a tab changes, the old PageLayout leaves with `page-fade-leave-to` and the new PageLayout enters. The `reveal-up` animation on `.page-layout` fires on mount, which is exactly when the new page appears. This is identical to the previous behavior.

---

## Step 2 — Audit style.css for now-redundant rules

Open `website/src/style.css`. Find the `.page-content` rule:

```css
.page-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-bottom: 5rem;
  -webkit-overflow-scrolling: touch;
}
```

This rule controls the scrollable area that wraps the `<Transition>` in both `App.vue` and `ManagementApp.vue`. It still exists in the template as `<div class="page-content">` and must continue to work.

**Do not remove this rule.** The `padding-bottom: 5rem` here is redundant now that `PageLayout` also adds `5rem` bottom padding to its column — but having both is harmless and removing the `style.css` one might break the scroll container on some viewport sizes. Leave it.

### Check for orphaned `.page` rules in scoped styles

In Parts 1 and 2 you should have removed `.page { animation: reveal-up 0.35s ease; }` from `HuntPage.vue` and `ArchivePage.vue`. Verify this is done. If either file still has this rule in its scoped styles, remove it now — the animation is handled by PageLayout and having it in both places would double-fire.

Run a search across the codebase:

```bash
grep -r "animation: reveal-up" website/src/components/
```

Expected output: No results, or only results from files that intentionally use this animation for non-page elements (like `SpotCard.vue` inline style). If you see it in `HuntPage.vue` or `ArchivePage.vue` scoped styles, remove it.

---

## Step 3 — Verify the NFC banner text alignment

Open the app in the browser (via `npm run dev`) and trigger an NFC compatibility message. The easiest way to test this is to temporarily set `nfcCompatMessage` to a long string in `App.vue` (revert after testing):

```typescript
// Temporary — revert after testing
nfcCompatMessage.value = "Web NFC is not available. Open this page in Chrome on Android over HTTPS.";
```

With this set, use Playwright to screenshot the Hunt tab. Verify:

1. The banner spans full width (correct — system alert)
2. The banner text is horizontally centered
3. The banner text aligns with the content below it (both constrained to 680px)
4. The banner does not cause horizontal scroll

Then switch the app to Danish (via Toybox language toggle) and screenshot again. Verify:

1. The Danish NFC message ("Web NFC er ikke tilgængeligt...") fits within the banner
2. No layout shift compared to the English version
3. The page content below the banner does not shift horizontally

**Revert the temporary change** to `nfcCompatMessage` after testing.

---

## Step 4 — Full Playwright visual verification

Run through every page in both languages using Playwright. This is the definitive verification step.

### Test matrix

For each item below, screenshot and visually confirm it looks correct.

**Main app — English:**

| Page | What to verify |
|---|---|
| Hunt tab (no wand) | Hero visible, scan circle centered, bottom nav visible |
| Hunt tab (with wand) | Hero visible, WandInfo card, YearSelector if multiple years, SpotCards |
| Archive tab | Hero visible, YearSelector, HuntView with spots |
| Toybox tab | Hero visible, language section at top, all form sections visible |

**Main app — Danish:**

| Page | What to verify |
|---|---|
| Hunt tab | All strings in Danish, no layout shift vs English, same content widths |
| Archive tab | Same widths as English version |
| Toybox tab | Danish labels, same layout |

**To switch to Danish for Playwright testing**, you can set localStorage directly:

```javascript
// In your Playwright test
await page.evaluate(() => localStorage.setItem('tryllestav-locale', 'da'));
await page.reload();
```

**Management app — English:**

| Page | What to verify |
|---|---|
| Initialize Wand tab | Hero visible, form visible, no NFC banner visible (it should be hidden since nfcCompatMessage is empty) |
| Configure Spot tab | Hero visible, connect buttons visible, NO NFC banner |

**Management app — Danish:**

Same as English, confirm no layout differences.

### What consistent layout looks like

Use Playwright to measure content widths programmatically if you want precision:

```javascript
const contentWidth = await page.evaluate(() => {
  const col = document.querySelector('.page-layout__column');
  return col ? col.getBoundingClientRect().width : null;
});
console.log('Content column width:', contentWidth);
// Should be the same on every page, capped at 680px
```

Run this on every page. The value must be identical across all pages for a given viewport width.

---

## Step 5 — Regression checks

Work through this checklist systematically.

### Layout regressions

- [ ] Content width is consistent across Hunt, Archive, and Toybox tabs
- [ ] Content width is consistent across Initialize Wand and Configure Spot tabs
- [ ] Content width in main app matches content width in management app
- [ ] No horizontal scrollbar appears on any page at 390px viewport width
- [ ] No horizontal scrollbar appears on any page at 768px viewport width
- [ ] The NFC banner text does not overflow horizontally in English
- [ ] The NFC banner text does not overflow horizontally in Danish
- [ ] The NFC banner is absent on the Configure Spot page
- [ ] Page entry animation (`reveal-up`) fires when switching tabs
- [ ] Bottom nav is always visible at the bottom of the screen

### Hero regressions

- [ ] Hunt page shows the correct hero (eyebrow: "Tryllestavsprojekt", NFC indicator dot)
- [ ] Archive page shows the correct hero
- [ ] Toybox page shows the correct hero
- [ ] Initialize Wand page shows the correct hero
- [ ] Configure Spot page shows the correct hero
- [ ] In Danish, all hero strings are in Danish
- [ ] The NFC indicator in the Hunt hero updates reactively (dot pulses when scanning active)

### Functional regressions

- [ ] Scanning a wand still works (NFC read still fires and updates state)
- [ ] Writing record 1 from Toybox still works
- [ ] Initialize Wand still works
- [ ] Language switching still works and persists on reload
- [ ] Installing the PWA prompt still appears in Toybox when available
- [ ] Tab switching transitions animate correctly

### Console check

Open browser DevTools console. There should be:
- No Vue warnings about missing props
- No "Failed to resolve component" warnings
- No "Property does not exist" TypeScript errors at runtime

---

## Step 6 — Documentation update

Per the project maintenance rules in `docs/MAINTENANCE.md`, this architectural change requires updating `AGENTS.md`.

In `AGENTS.md`, find the **Website** section and update the capability list. Replace any mention of per-page layout handling with:

```
- Unified page layout via PageLayout component (NFC banner, NfcToast, PageHero, content width constraint)
```

Also update the component list in `docs/01-PROJECT-OVERVIEW.md`. In the key files table for `website/`, add:

```
- `src/components/PageLayout.vue` — Unified page shell (NFC banner, toast, hero, content container)
```

---

## Common mistakes and how to fix them

### "The hero is missing on one page"

Check that the corresponding `<PageLayout>` call in `App.vue` or `ManagementApp.vue` has `hero-title` set. The hero only renders when `heroTitle` is a non-empty string.

### "The page content has no horizontal padding"

Check that `ToyboxPanel` or another component is not setting `padding: 0` on its own root element and accidentally cancelling `PageLayout`'s `.page-layout__content { padding: 0 1rem }`. PageLayout provides `1rem` horizontal padding to slot content. Components inside the slot should not add their own horizontal padding unless they have a specific reason.

### "Content is too narrow / the 680px cap feels tight on desktop"

680px is the canonical width. If it needs adjustment, change it in exactly one place: `.page-layout__column { max-width: 680px }` in `PageLayout.vue`. Do not add per-page overrides.

### "The NFC banner is showing on Configure Spot even though showNfcBanner is false"

The banner uses `v-if="showNfcBanner && nfcCompatMessage"`. Both must be truthy. If `showNfcBanner` is `false`, the banner will not render regardless of `nfcCompatMessage`. Check that `show-nfc-banner="false"` is set on the Configure Spot `<PageLayout>` call in `ManagementApp.vue`. Note: in Vue, passing a boolean prop as `show-nfc-banner="false"` (string) is different from `:show-nfc-banner="false"` (boolean). Make sure you use the colon binding: `:show-nfc-banner="false"`.

### "The reveal-up animation fires twice"

This means both `PageLayout`'s `.page-layout` animation and a leftover `.page` animation in a child component are firing. Run the grep from Step 2 and remove the orphaned rule.

### "Switching to Danish shifts content width"

This means a string somewhere is using `width: fit-content` or `display: inline-flex` without a width constraint, and the longer Danish string is making it wider. Check the NFC banner — the `.nfc-banner__text` element has `max-width: 680px` and `overflow-wrap: break-word` which should prevent this. If the issue is elsewhere, use Playwright to identify which element is changing width by measuring `getBoundingClientRect()` before and after language switch.

---

## Final checklist

- [ ] `npm run build` passes
- [ ] All items in the test matrix confirmed via Playwright
- [ ] All regression checks passed
- [ ] No console errors or Vue warnings
- [ ] `AGENTS.md` updated
- [ ] `docs/01-PROJECT-OVERVIEW.md` updated

**Implementation is complete when all boxes are checked.**
