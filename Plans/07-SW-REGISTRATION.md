# Phase 7 — Move Service Worker Registration

## Goal

Move the service worker registration code from `main.ts` (the module entry point) into a dedicated `usePwa.ts` composable that is called from `App.vue`.

**Why this matters:**
- `main.ts` runs immediately when the JS bundle parses — there is no opportunity to cancel or conditionally skip registration.
- Placing SW registration in a composable makes it testable, conditionally runnable, and co-located with other PWA logic (the install prompt handling, which is already in `App.vue`).
- The install prompt handling (`beforeinstallprompt`, `appinstalled` event listeners) is currently in `App.vue`. It belongs in the same composable as SW registration since together they form the complete PWA surface.

## Files to Create

| New File | Contains |
|----------|---------|
| `website/src/composables/usePwa.ts` | SW registration + install prompt handling |

## Files to Edit

| File | Change |
|------|--------|
| `website/src/main.ts` | Remove SW registration block |
| `website/src/App.vue` | Remove install prompt logic; import and use `usePwa` |

---

## Step 1 — Create `usePwa.ts`

**File:** `website/src/composables/usePwa.ts`

```ts
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { resolveVersionedAppUrl } from "../utils/appUrl";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export interface PwaState {
  canInstall: ReturnType<typeof computed<boolean>>;
  promptInstall: () => Promise<void>;
}

export function usePwa(): PwaState {
  const deferredInstallPrompt = ref<BeforeInstallPromptEvent | null>(null);
  const isStandalone = ref(false);

  // ── Service Worker ─────────────────────────────────────────────────────

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register(resolveVersionedAppUrl("sw.js"))
        .catch((error: unknown) => {
          console.error("Service worker registration failed:", error);
        });
    });
  }

  // ── Install Prompt ─────────────────────────────────────────────────────

  function detectStandaloneMode() {
    const navigatorWithStandalone = window.navigator as Navigator & {
      standalone?: boolean;
    };
    isStandalone.value =
      window.matchMedia("(display-mode: standalone)").matches ||
      navigatorWithStandalone.standalone === true;
  }

  function handleBeforeInstallPrompt(event: Event) {
    const installEvent = event as BeforeInstallPromptEvent;
    installEvent.preventDefault();
    deferredInstallPrompt.value = installEvent;
  }

  function handleAppInstalled() {
    deferredInstallPrompt.value = null;
    detectStandaloneMode();
  }

  async function promptInstall(): Promise<void> {
    if (!deferredInstallPrompt.value) return;

    await deferredInstallPrompt.value.prompt();
    const choice = await deferredInstallPrompt.value.userChoice;

    if (choice.outcome !== "accepted") return;

    deferredInstallPrompt.value = null;
    detectStandaloneMode();
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  onMounted(() => {
    detectStandaloneMode();
    registerServiceWorker();
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.removeEventListener("appinstalled", handleAppInstalled);
  });

  // ── Public API ─────────────────────────────────────────────────────────

  const canInstall = computed(
    () => deferredInstallPrompt.value !== null && !isStandalone.value,
  );

  return { canInstall, promptInstall };
}
```

### Notes

- `BeforeInstallPromptEvent` interface is moved from `App.vue` into this composable since it is only needed here.
- `detectStandaloneMode` replaces `updateStandaloneState` from `App.vue` — same logic, clearer name.
- `registerServiceWorker` uses `window.addEventListener("load", ...)` which is safe to call inside `onMounted` — the `load` event may have already fired, but that is acceptable because `onMounted` runs during or after page load and SW registration is not time-critical.
- `canInstall` replaces `canInstallPwa` from `App.vue`.
- `promptInstall` is identical to the function in `App.vue` — it is simply moved here.

---

## Step 2 — Update `main.ts`

### Remove the SW registration block

Open `website/src/main.ts`. It currently looks like this:

```ts
import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import { resolveVersionedAppUrl } from "./utils/appUrl";

const app = createApp(App);
app.mount("#app");

// Register service worker for PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(resolveVersionedAppUrl("sw.js"))
      .catch((error: unknown) => {
        console.error("Service worker registration failed:", error);
      });
  });
}
```

Remove the SW registration block and the `resolveVersionedAppUrl` import (if it is only used there):

```ts
import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";

const app = createApp(App);
app.mount("#app");
```

That is all `main.ts` should contain.

---

## Step 3 — Update `App.vue`

### 3a. Remove the `BeforeInstallPromptEvent` interface

Find and remove this interface from `App.vue`'s `<script setup>`:

```ts
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}
```

It is now defined inside `usePwa.ts`.

### 3b. Remove PWA-related declarations

Remove these items from `App.vue`'s `<script setup>`:

```ts
// Remove these refs
const deferredInstallPrompt = ref<BeforeInstallPromptEvent | null>(null);
const isStandalonePwa = ref(false);

// Remove this computed
const canInstallPwa = computed(
  () => deferredInstallPrompt.value !== null && !isStandalonePwa.value,
);

// Remove these functions
function updateStandaloneState() { ... }
function handleBeforeInstallPrompt(event: Event) { ... }
function handleAppInstalled() { ... }
async function promptInstall() { ... }
```

### 3c. Remove event listener registrations from `onMounted` and `onBeforeUnmount`

From `onMounted`, remove:
```ts
updateStandaloneState();
window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
window.addEventListener("appinstalled", handleAppInstalled);
```

From `onBeforeUnmount`, remove:
```ts
window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
window.removeEventListener("appinstalled", handleAppInstalled);
```

### 3d. Add the `usePwa` composable call

Add this import at the top of `<script setup>`:

```ts
import { usePwa } from "./composables/usePwa";
```

Add the composable call alongside the other composable calls:

```ts
const { canInstall: canInstallPwa, promptInstall } = usePwa();
```

The destructuring uses `canInstall: canInstallPwa` to keep the existing name `canInstallPwa` that is referenced in the template (`ToyboxPanel`'s `:show-install-action="canInstallPwa"`). This means no template changes are needed.

### 3e. Verify `onMounted` and `onBeforeUnmount`

After the removals, `onMounted` should only contain:

```ts
onMounted(async () => {
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

And `onBeforeUnmount` should be empty or removed entirely if it has no remaining content.

### 3f. Remove unused imports from `App.vue`

If `resolveVersionedAppUrl` was imported in `App.vue`, check whether it is still used. If not, remove the import. (It was used in `main.ts` but not directly in `App.vue`.)

Also check if `ref` is still needed for `showNfcConsent` and `nfcToastVisible` — it should be. Keep it.

---

## Final State Summary

After Phase 7, the responsibility of each file is:

| File | Responsibility |
|------|---------------|
| `main.ts` | Create Vue app and mount it. Nothing else. |
| `usePwa.ts` | SW registration + install prompt lifecycle |
| `App.vue` | Orchestrate composables; render top-level layout |

---

## Verification Checklist

After completing all steps in this phase:

- [ ] `website/src/composables/usePwa.ts` exists
- [ ] `usePwa.ts` contains `registerServiceWorker`, `promptInstall`, `canInstall`, and lifecycle hooks
- [ ] `main.ts` contains only the `createApp` and `mount` calls (3–5 lines total)
- [ ] `main.ts` does not import `resolveVersionedAppUrl`
- [ ] `App.vue` does not contain `BeforeInstallPromptEvent` interface
- [ ] `App.vue` does not contain `deferredInstallPrompt`, `isStandalonePwa`, `updateStandaloneState`, `handleBeforeInstallPrompt`, `handleAppInstalled`
- [ ] `App.vue` imports and calls `usePwa()`
- [ ] `App.vue` `onMounted` does not register `beforeinstallprompt` or `appinstalled` event listeners
- [ ] `App.vue` `onBeforeUnmount` does not remove `beforeinstallprompt` or `appinstalled` event listeners
- [ ] Run `npm run build` from `website/` — must succeed with zero TypeScript errors
- [ ] Test: app loads and service worker registers (check browser DevTools → Application → Service Workers)
- [ ] Test: if a PWA install prompt is available in the browser, the Toybox install button appears
- [ ] Test: clicking the install button triggers the native install prompt
