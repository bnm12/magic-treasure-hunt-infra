# Localization Implementation Guide
## Part 2 of 4: Updating useNfc and Shared Composables

---

## Before You Begin

- Part 1 must be complete and `npm run build` must be passing before you start this part.
- This part updates `useNfc.ts` — the most critical file in the codebase. Read the instructions for each step completely before making any edits.

---

## What This Part Covers

1. Create a shared i18n instance module
2. Update `main.ts` and `management/main.ts` to use it
3. Update `useLocale.ts` to use it
4. Update `useNfc.ts` to use translated status strings

---

## Understanding useNfc.ts Before Editing

`useNfc.ts` sets user-visible messages by writing to `status.value` and `nfcCompatMessage.value` like this:

```typescript
status.value = "Wand detected!";
nfcCompatMessage.value = "Web NFC is not available...";
```

These strings are now in the locale files under the `"nfc"` namespace. You will replace each hardcoded string with a call to `t()`.

**Why not `useI18n()`?**

`useI18n()` can only be called inside a component's `setup()` function. `useNfc` is a composable — not a component. Therefore you must access translations through the shared i18n instance directly.

---

## Step 1 — Create a shared i18n instance module

Right now `main.ts` creates the i18n instance inline. The problem is that `useNfc.ts` also needs access to it, and it cannot import from `main.ts` (that would create a circular dependency). The solution is to move the instance into its own module that both can import.

**Create `website/src/i18n.ts`:**

```typescript
import { createI18n } from "vue-i18n";
import en from "./locales/en.json";
import da from "./locales/da.json";
import { detectLocale } from "./composables/useLocale";

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: "en",
  messages: { en, da },
});
```

---

## Step 2 — Update main.ts to import from the shared module

**Replace `website/src/main.ts`:**

```typescript
import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import { i18n } from "./i18n";

const app = createApp(App);
app.use(i18n);
app.mount("#app");
```

**Replace `website/management/main.ts`:**

```typescript
import { createApp } from "vue";
import ManagementApp from "../src/ManagementApp.vue";
import "../src/style.css";
import { i18n } from "../src/i18n";
import { resolveVersionedAppUrl } from "../src/utils/appUrl";

const app = createApp(ManagementApp);
app.use(i18n);
app.mount("#app");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(resolveVersionedAppUrl("../management-sw.js"))
      .catch((error: unknown) => {
        console.error("Management service worker registration failed:", error);
      });
  });
}
```

---

## Step 3 — Update useLocale.ts

Now that the instance lives in `src/i18n.ts`, `useLocale` can import it directly rather than receiving it as a parameter. This also exports the `detectLocale` function that `src/i18n.ts` depends on — that import order is safe because `detectLocale` does not itself import from `src/i18n.ts`.

**Replace `website/src/composables/useLocale.ts`:**

```typescript
import { i18n } from "../i18n";

const STORAGE_KEY = "tryllestav-locale";
const SUPPORTED_LOCALES = ["en", "da"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Detects the preferred locale in priority order:
 * 1. Previously saved preference in localStorage
 * 2. Browser language (navigator.language, stripped to base tag e.g. "da-DK" -> "da")
 * 3. English fallback
 */
export function detectLocale(): SupportedLocale {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && isSupportedLocale(saved)) return saved;

  const browserLang = navigator.language?.split("-")[0]?.toLowerCase() ?? "";
  if (isSupportedLocale(browserLang)) return browserLang;

  return "en";
}

/**
 * Returns helpers for reading and changing the active locale.
 * Operates on the shared i18n instance.
 */
export function useLocale() {
  function setLocale(locale: SupportedLocale) {
    i18n.global.locale.value = locale;
    localStorage.setItem(STORAGE_KEY, locale);
  }

  function currentLocale(): SupportedLocale {
    const val = i18n.global.locale.value;
    return isSupportedLocale(val) ? val : "en";
  }

  return {
    setLocale,
    currentLocale,
    supportedLocales: SUPPORTED_LOCALES,
  };
}
```

---

## Step 4 — Update useNfc.ts

Open `website/src/composables/useNfc.ts`. You will make two categories of changes:

1. Add imports and a module-level shorthand
2. Replace every hardcoded user-facing string

### 4a — Add the import and shorthand

Add this import after the existing imports at the top of the file:

```typescript
import { i18n } from "../i18n";
```

Then add this line immediately after the import block, before the constant `HUNT_MIME_PREFIX`:

```typescript
const { t } = i18n.global;
```

### 4b — Replace all hardcoded status strings

The table below lists every string that must be replaced. Find the exact text on the left in the file and replace the entire assignment statement with the version on the right.

**Do not change anything else.** Only the string literals change. All logic, variable names, and structure stay identical.

---

**Replacements in `beginScanning()`:**

Find:
```typescript
nfcCompatMessage.value =
  "Web NFC is unavailable. Use HTTPS on Android Chrome or Samsung Internet.";
```
Replace with:
```typescript
nfcCompatMessage.value = t("nfc.unavailable");
```

---

Find:
```typescript
nfcCompatMessage.value = "Web NFC is not supported on this device.";
```
Replace with:
```typescript
nfcCompatMessage.value = t("nfc.not_supported");
```

---

Find (template literal):
```typescript
status.value = `Scan failed: ${err.message}`;
```
Replace with:
```typescript
status.value = t("nfc.scan_failed", { error: err.message });
```

---

**Replacements in the `ndef.onreading` handler inside `beginScanning()`:**

Find:
```typescript
status.value = "Wand detected!";
```
Replace with:
```typescript
status.value = t("nfc.detected");
```

---

Find:
```typescript
status.value = "Could not read the wand. Try again.";
```
Replace with:
```typescript
status.value = t("nfc.read_failed");
```

---

**Replacements in `shouldAbortWrite()`:**

Find:
```typescript
nfcCompatMessage.value =
  "Web NFC is unavailable. Use HTTPS on Android Chrome or Samsung Internet.";
```
Replace with:
```typescript
nfcCompatMessage.value = t("nfc.unavailable");
```

---

**Replacements in `writeRecord1()`:**

Find:
```typescript
status.value = "Hold the wand near your device to verify and write...";
```
Replace with:
```typescript
status.value = t("nfc.write_verify");
```

---

Find (the string passed to `readTagOnce`):
```typescript
const currentRecords = await readTagOnce(
  "Hold the wand near your device to verify its current records...",
);
```
Replace with:
```typescript
const currentRecords = await readTagOnce(
  t("nfc.write_verify_reading"),
);
```

---

Find:
```typescript
status.value =
  "Record 1 written! The tag was read first and treasure progress was preserved.";
```
Replace with:
```typescript
status.value = t("nfc.write_record1_success");
```

---

Find (template literal):
```typescript
status.value = `Write failed: ${err.message}`;
```
Replace with:
```typescript
status.value = t("nfc.write_record1_failed", { error: err.message });
```

---

**Replacements in `initializeWand()`:**

Find:
```typescript
status.value = "Owner name must be 1-127 characters.";
```
Replace with:
```typescript
status.value = t("nfc.init_name_invalid");
```

---

Find:
```typescript
status.value = "Bring blank tag to initialize as wand...";
```
Replace with:
```typescript
status.value = t("nfc.init_prompt");
```

---

Find (template literal):
```typescript
status.value = `SUCCESS: Wand initialized for ${ownerName} (year ${creationYear})!`;
```
Replace with:
```typescript
status.value = t("nfc.init_success", { name: ownerName, year: creationYear });
```

---

Find (template literal):
```typescript
status.value = `Initialization failed: ${err.message}`;
```
Replace with:
```typescript
status.value = t("nfc.init_failed", { error: err.message });
```

---

**Replacements in `unlockTestSpot()`:**

Find:
```typescript
status.value = "Choose a valid hunt year and a spot ID between 1 and 64.";
```
Replace with:
```typescript
status.value = t("nfc.unlock_invalid");
```

---

Find (template literal):
```typescript
status.value = `Hold the wand near your device to unlock spot ${spotId} for ${year}...`;
```
Replace with:
```typescript
status.value = t("nfc.unlock_prompt", { spot: spotId, year });
```

---

Find (the string passed to `readTagOnce` inside `unlockTestSpot`):
```typescript
const currentRecords = await readTagOnce(
  "Hold the wand near your device to verify its current records...",
);
```
Replace with:
```typescript
const currentRecords = await readTagOnce(
  t("nfc.write_verify_reading"),
);
```

---

Find (template literal):
```typescript
status.value = `Unlocked spot ${spotId} for ${year} on the wand.`;
```
Replace with:
```typescript
status.value = t("nfc.unlock_success", { spot: spotId, year });
```

---

Find (template literal):
```typescript
status.value = `Unlock failed: ${err.message}`;
```
Replace with:
```typescript
status.value = t("nfc.unlock_failed", { error: err.message });
```

---

**In `App.vue` — the nfcCompatMessage set on mount:**

Note: There is one more hardcoded NFC string that lives in `App.vue` rather than `useNfc.ts`:

```typescript
nfcCompatMessage.value =
  "NFC permission was denied. Please allow NFC access in your browser settings and refresh.";
```

You will update this in Part 3 when you work through the components. Leave it for now.

---

## Step 5 — Verify the build

```bash
cd website
npm run build
```

**Common errors and fixes:**

| Error | Fix |
|---|---|
| `Property 't' does not exist` | Confirm `legacy: false` in `src/i18n.ts` |
| `Cannot find module '../i18n'` | Confirm `src/i18n.ts` exists |
| `Module has circular dependency` | Check that `src/i18n.ts` does not import from `useLocale.ts` at module evaluation time — it only calls `detectLocale()` which is a pure function with no circular imports |

---

## Checklist Before Moving to Part 3

- [ ] `src/i18n.ts` exists and exports a single `i18n` instance with `legacy: false`
- [ ] `src/main.ts` imports `i18n` from `./i18n` and calls `app.use(i18n)`
- [ ] `management/main.ts` imports `i18n` from `../src/i18n` and calls `app.use(i18n)`
- [ ] `src/composables/useLocale.ts` imports from `../i18n` and no longer takes a parameter
- [ ] `src/composables/useNfc.ts` has `import { i18n } from "../i18n"` at the top
- [ ] `src/composables/useNfc.ts` has `const { t } = i18n.global;` at module level
- [ ] Every hardcoded status string in `useNfc.ts` has been replaced per the table above
- [ ] `npm run build` passes

**Do not proceed to Part 3 until all boxes are checked.**
