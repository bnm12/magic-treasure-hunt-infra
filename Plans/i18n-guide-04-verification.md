# Localization Implementation Guide
## Part 4 of 4: Verification, Docs Update & Handoff

---

## Before You Begin

- Parts 1, 2, and 3 must be complete.
- `npm run build` must be passing before starting this part.

---

## What This Part Covers

1. Manual verification checklist
2. Runtime smoke test procedure
3. Documentation updates required by the project maintenance rules
4. Common mistakes reference

---

## Step 1 — Full build and type check

Run both commands:

```bash
cd website
npm run build
```

Both must complete without errors. If either fails, return to the part that introduced the failure and fix it before continuing.

---

## Step 2 — Runtime smoke test

Start the dev server:

```bash
cd website
npm run dev
```

Open the app in a browser. Work through this checklist:

### 2a — English baseline

Clear localStorage before testing to ensure a clean state:
1. Open browser DevTools → Application → Local Storage → delete `tryllestav-locale`
2. Reload the page
3. Verify all strings display in English — no raw keys like `hunt.title` should be visible anywhere

If you see a raw key instead of a string, it means that key is missing from `en.json`. Add it and reload.

### 2b — Language switch to Danish

1. Navigate to the Toybox tab
2. Find the Language section at the top
3. Click "Dansk"
4. Verify:
   - All nav tab labels change to Danish
   - The page hero titles and copy change
   - Spot badges say "Samlet" / "Uopdaget"
   - The Toybox section labels change
5. Reload the page — Danish should persist (stored in localStorage)
6. Open DevTools → Application → Local Storage → confirm `tryllestav-locale` is set to `"da"`

### 2c — Browser language detection

1. Clear `tryllestav-locale` from localStorage
2. In DevTools → Network conditions (or browser language settings), set browser language to `da`
3. Reload
4. Verify the app loads in Danish without the user having to select anything

### 2d — Fallback check

1. Open `src/locales/da.json`
2. Temporarily delete one key — for example `"detected"` from the `"nfc"` section
3. Reload the dev server
4. Switch to Danish
5. Verify the app shows the English fallback for that key rather than an empty string or raw key
6. Restore the deleted key

### 2e — Management app

Open `/management/` in the browser:
1. Verify the Initialize Wand tab shows Danish strings when Danish is selected
2. Verify the Configure Spot tab shows Danish strings
3. Note: the language toggle is only in the main Toybox. The management app inherits locale from localStorage. This is correct behavior — no fix needed.

---

## Step 3 — Documentation updates

The project has a strict rule documented in `docs/MAINTENANCE.md`: code changes that affect architecture or user-facing behavior require doc updates in the same change. This change touches multiple components, adds a new dependency, and adds a new user-visible feature (the language toggle). The following doc changes are required.

### 3a — Update AGENTS.md

In the **Website** section of AGENTS.md, find the current capability list and add:

```
- Localization support (English and Danish) via vue-i18n, with browser language auto-detection and manual override in Toybox
```

### 3b — Update docs/01-PROJECT-OVERVIEW.md

In the **Website (`website/`)** section under **Tech stack**, add `vue-i18n@9` to the framework list.

In the **Component Roles and States** table, the "Website PWA" row currently says "Functional". No status change needed, but if you add notes, mention localization is implemented.

### 3c — Update docs/05-BUILD-AND-DEPLOY.md

In the **Prerequisites → For Website Development** section, no changes needed — the dependency is installed via `npm install` which is already documented.

Add a new short section under **Development Workflow** called **Adding or updating translations**:

```markdown
### Adding or updating translations

Locale strings live in `website/src/locales/`. Two files exist:

- `en.json` — English (canonical, source of truth)
- `da.json` — Danish

**To add a new string:**
1. Add the key and English value to `en.json`
2. Add the same key and Danish value to `da.json`
3. Use `t('your.key')` in the component

**To add a new language:**
1. Add a new JSON file e.g. `src/locales/de.json` with all the same keys as `en.json`
2. Add `de` to the `SUPPORTED_LOCALES` array in `src/composables/useLocale.ts`
3. Import the new file in `src/i18n.ts` and add it to the `messages` object
4. Add `"de": "Deutsch"` to the `"language"` section in both existing locale files
5. Add the language button to `ToyboxPanel.vue` — it will appear automatically because the template iterates `supportedLocales`

**Key parity rule:** Every key in `en.json` must also exist in `da.json`. Missing keys fall back to English silently, but this should be treated as a bug to fix, not a feature to rely on.
```

---

## Step 4 — Common mistakes reference

Keep this section as a reference if something is not working.

---

### "Raw key displayed instead of translated string"

Example: the page shows `hunt.title` instead of "Magic Wand Companion".

**Cause:** The key does not exist in the locale file, or `useI18n()` was not called in the component.

**Fix:** Check that the key is in `en.json`. Check that `const { t } = useI18n()` is present in the component's `<script setup>`.

---

### "The language switch works once but resets on reload"

**Cause:** `setLocale` is not writing to localStorage, or `detectLocale` is not reading from it.

**Fix:** Check `useLocale.ts` — confirm `localStorage.setItem(STORAGE_KEY, locale)` is called in `setLocale`. Confirm `localStorage.getItem(STORAGE_KEY)` is called first in `detectLocale`.

---

### "Nav tabs don't update when I switch language"

**Cause:** `navTabs` was left as a static `const` instead of being converted to `computed`.

**Fix:** In `App.vue`, confirm `navTabs` is defined as `const navTabs = computed<NavTab[]>(() => [...])`. Same for `tabs` in `ManagementApp.vue`.

---

### "TypeScript error: Property 't' does not exist on type"

**Cause:** `legacy: false` is missing from `createI18n` in `src/i18n.ts`.

**Fix:** Confirm `legacy: false` is set. Without it, `useI18n()` returns a different interface that does not expose `t` directly in Composition API usage.

---

### "Circular dependency warning"

**Cause:** `useLocale.ts` imports from `src/i18n.ts`, and `src/i18n.ts` calls `detectLocale()` from `useLocale.ts`.

**This is safe.** JavaScript module evaluation handles this correctly because `detectLocale` is a plain function — it does not reference the i18n instance. The circular reference is purely structural, not evaluative. Bundlers may warn about it; you can suppress the warning or restructure by moving `detectLocale` to a separate `src/utils/detectLocale.ts` file that neither i18n.ts nor useLocale.ts depends on circularly. This is optional.

---

### "Plural forms not working — always shows the 'many' form"

**Cause:** The `t()` call for plural keys must use the named parameter `n`, not a positional argument.

**Fix:** Confirm the call is `t('hunt.progress_remaining', { n: count })` — specifically the object form with key `n`. The locale string uses `{n}` as the interpolation token.

---

### "Status strings in useNfc are still in English after switching to Danish"

**Cause:** The `t` shorthand in `useNfc.ts` was captured at module initialization time when `i18n.global` was created. Because `i18n.global.t` is a function that reads the current locale reactively at call time, this is actually correct — calling `t("nfc.detected")` when the locale is Danish will return the Danish string.

**If it is still returning English:** Confirm the Danish key exists in `da.json`. Confirm the locale was actually changed (check localStorage). Confirm `const { t } = i18n.global` not `const t = i18n.global.t.bind(something-wrong)`.

---

## Final handoff checklist

- [ ] `npm run build` passes
- [ ] All strings display in English by default
- [ ] Switching to Danish in Toybox changes all UI strings
- [ ] Danish persists across page reload
- [ ] Browser set to `da` loads Danish automatically on first visit
- [ ] Management app inherits locale from localStorage
- [ ] No raw keys visible anywhere in either language
- [ ] `AGENTS.md` updated
- [ ] `docs/01-PROJECT-OVERVIEW.md` updated
- [ ] `docs/05-BUILD-AND-DEPLOY.md` updated with translation workflow

**Implementation is complete when all boxes are checked.**
