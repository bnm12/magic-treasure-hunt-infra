# MG-03 — Create Management App Files

## Goal

Create all the source files for the management app: the HTML entry point, the Vue mount, and the root component. These three files are the entire management app — everything else is imported from the shared `src/` directory.

---

## Files to Create

| File | Purpose |
|------|---------|
| `website/management/index.html` | HTML entry point for the management app |
| `website/src/management/main.ts` | Vue `createApp` + mount for the management app |
| `website/src/management/ManagementApp.vue` | Root component: tabs, navigation, layout |

---

## Step 1 — Create `website/management/index.html`

This file is the HTML entry point. It lives at the **Vite project root** level (inside `website/`), not inside `src/`. This placement is what makes Vite serve it at `/management/` during development.

**File path:** `website/management/index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="../favicon.svg" />
    <link rel="manifest" href="../management-manifest.webmanifest" />
    <link rel="apple-touch-icon" href="../apple-touch-icon.png" />
    <meta name="theme-color" content="#0b0b1a" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Stav Admin" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, viewport-fit=cover"
    />
    <meta
      name="description"
      content="Initialize wands and configure magic spots."
    />
    <title>Tryllestav Management</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="../src/management/main.ts"></script>
  </body>
</html>
```

### Why `../` paths

This HTML file is one directory level deep (`website/management/`). The favicon, manifest, and apple-touch-icon live in `website/public/`, which Vite serves at the root `/`. From the perspective of a browser loading `/management/index.html`, those assets are at `../favicon.svg`, `../management-manifest.webmanifest`, etc.

The `<script src>` points to `../src/management/main.ts` — going up to `website/` then into `src/management/`. Vite resolves this as a TypeScript module during both dev and build.

### Do not copy the font or icon tags from the main `index.html`

The main `index.html` does not include any font tags — fonts are loaded via `@import` in `style.css`, which the management app's Vue component imports. Do not add separate font link tags here.

---

## Step 2 — Create `website/src/management/main.ts`

This file creates and mounts the management app. It is intentionally minimal.

**File path:** `website/src/management/main.ts`

```ts
import { createApp } from "vue";
import ManagementApp from "./ManagementApp.vue";
import "../style.css";
import { resolveVersionedAppUrl } from "../utils/appUrl";

const app = createApp(ManagementApp);
app.mount("#app");

// Register service worker for PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(resolveVersionedAppUrl("management-sw.js"))
      .catch((error: unknown) => {
        console.error("Management service worker registration failed:", error);
      });
  });
}
```

### Notes

- `import "../style.css"` imports the shared global stylesheet from one level up. This gives the management app all CSS variables, typography, button styles, and animations.
- `resolveVersionedAppUrl("management-sw.js")` resolves the service worker URL relative to `document.baseURI` — the same pattern used by the main app for its service worker. This handles the subdirectory path correctly.
- The service worker file `management-sw.js` will be created in MG-04.
- If MG-07 from the refactor guide has been applied (moving SW registration to `usePwa.ts`), you should still keep SW registration directly here in `main.ts` for the management app. The `usePwa` composable is designed for the main app's install-prompt flow. The management app does not need a full install-prompt UI — just the SW registration.

---

## Step 3 — Create `website/src/management/ManagementApp.vue`

This is the root component for the management app. It renders two tabs (Initialize Wand and Configure Spot), a header with a back link to the main app, and the currently active tool.

**File path:** `website/src/management/ManagementApp.vue`

```vue
<template>
  <div id="management-app">
    <MagicBackground />

    <div class="mgmt-shell">
      <header class="mgmt-header">
        <a :href="mainAppUrl" class="back-link" aria-label="Back to hunt app">
          <span class="back-arrow" aria-hidden="true">←</span>
          <span class="back-label">Hunt App</span>
        </a>

        <div class="mgmt-title">
          <span class="mgmt-title-icon" aria-hidden="true">⚙</span>
          <span class="mgmt-title-text">Management</span>
        </div>

        <div class="mgmt-header-spacer" aria-hidden="true"></div>
      </header>

      <nav class="mgmt-tabs" role="tablist" aria-label="Management tools">
        <button
          class="mgmt-tab"
          :class="{ active: activeTool === 'initialize' }"
          role="tab"
          :aria-selected="activeTool === 'initialize'"
          type="button"
          @click="activeTool = 'initialize'"
        >
          <IconWandTweaker class="mgmt-tab-icon" aria-hidden="true" />
          <span>Initialize Wand</span>
        </button>

        <button
          class="mgmt-tab"
          :class="{ active: activeTool === 'configureSpot' }"
          role="tab"
          :aria-selected="activeTool === 'configureSpot'"
          type="button"
          @click="activeTool = 'configureSpot'"
        >
          <IconWand class="mgmt-tab-icon" aria-hidden="true" />
          <span>Configure Spot</span>
        </button>
      </nav>

      <main class="mgmt-content">
        <Transition name="mgmt-fade" mode="out-in">
          <InitializePage
            v-if="activeTool === 'initialize'"
            key="initialize"
            :year="currentYear"
            :is-writing="isWriting"
            :initialize-wand="initializeWand"
          />

          <ConfigureSpotPage
            v-else-if="activeTool === 'configureSpot'"
            key="configureSpot"
          />
        </Transition>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import MagicBackground from "../components/MagicBackground.vue";
import InitializePage from "../components/InitializePage.vue";
import ConfigureSpotPage from "../components/ConfigureSpotPage.vue";
import IconWandTweaker from "../components/icons/IconWandTweaker.vue";
import IconWand from "../components/icons/IconWand.vue";
import { useNfc } from "../composables/useNfc";
import { resolveAppUrl } from "../utils/appUrl";

// ── NFC ──────────────────────────────────────────────────────────────────────

const { isWriting, initializeWand } = useNfc();

// ── Navigation ───────────────────────────────────────────────────────────────

type Tool = "initialize" | "configureSpot";
const activeTool = ref<Tool>("initialize");

// ── State ────────────────────────────────────────────────────────────────────

const currentYear = new Date().getFullYear();

// ── Back link ────────────────────────────────────────────────────────────────
// Resolves to the main app root, accounting for any subpath deployment
// (e.g. GitHub Pages repo subpath).
// resolveAppUrl("") returns document.baseURI with empty path appended,
// then we navigate up one level from /management/ to reach /.
const mainAppUrl = resolveAppUrl("../");
</script>

<style scoped>
#management-app {
  max-width: 100%;
  margin: 0 auto;
  min-height: 100svh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  position: relative;
  isolation: isolate;
  overflow-x: hidden;
}

.mgmt-shell {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
}

/* ── Header ── */

.mgmt-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: rgba(11, 11, 26, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 50;
}

.back-link {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--accent);
  text-decoration: none;
  font-size: 0.8rem;
  font-weight: 600;
  opacity: 0.85;
  transition: opacity 0.2s ease;
  min-width: 5rem;
}

.back-link:hover {
  opacity: 1;
}

.back-arrow {
  font-size: 1rem;
  line-height: 1;
}

.mgmt-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: var(--heading);
  font-size: 0.9rem;
  font-weight: 600;
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.mgmt-title-icon {
  font-size: 1rem;
  -webkit-text-fill-color: var(--accent);
  filter: drop-shadow(0 0 6px rgba(212, 168, 67, 0.4));
}

.mgmt-header-spacer {
  min-width: 5rem;
}

/* ── Tabs ── */

.mgmt-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  background: rgba(11, 11, 26, 0.6);
  backdrop-filter: blur(8px);
}

.mgmt-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.75rem 0.5rem 0.65rem;
  border: none;
  background: transparent;
  color: var(--text);
  font-family: var(--sans);
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  cursor: pointer;
  transition: all 0.25s ease;
  position: relative;
}

.mgmt-tab:hover {
  color: var(--accent);
}

.mgmt-tab.active {
  color: var(--accent);
}

.mgmt-tab.active::after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 10%;
  right: 10%;
  height: 2px;
  background: var(--gradient-gold);
  border-radius: 1px;
  box-shadow: 0 0 8px rgba(212, 168, 67, 0.5);
  animation: indicator-appear 0.25s ease;
}

.mgmt-tab-icon {
  font-size: 1.3rem;
  transition: transform 0.25s ease, filter 0.25s ease;
}

.mgmt-tab.active .mgmt-tab-icon {
  transform: scale(1.1);
  filter: drop-shadow(0 0 6px rgba(212, 168, 67, 0.4));
}

/* ── Content ── */

.mgmt-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* ── Transitions ── */

.mgmt-fade-enter-active,
.mgmt-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.mgmt-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.mgmt-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@keyframes indicator-appear {
  from { width: 0; opacity: 0; left: 50%; right: 50%; }
  to   { left: 10%; right: 10%; opacity: 1; }
}

/* ── Responsive ── */

@media (max-width: 600px) {
  .mgmt-header {
    padding: 0.65rem 1rem;
  }

  .mgmt-title {
    font-size: 0.82rem;
  }

  .back-label {
    display: none;
  }

  .back-arrow {
    font-size: 1.1rem;
  }
}
</style>
```

### Notes on `resolveAppUrl("../")`

The `resolveAppUrl` utility resolves a path relative to `document.baseURI`. When the management app is loaded from `/management/index.html`, `document.baseURI` is `https://example.com/management/`. Calling `resolveAppUrl("../")` resolves `../` relative to that base, giving `https://example.com/` — the main app root.

This handles GitHub Pages subpath deployments automatically. If the site is deployed at `https://user.github.io/repo-name/`, then:
- Management app base: `https://user.github.io/repo-name/management/`
- `resolveAppUrl("../")` → `https://user.github.io/repo-name/`

**Do not hardcode `/` as the back link href.** Always use `resolveAppUrl("../")`.

### Notes on `useNfc()`

The management app calls `useNfc()` only to access `isWriting` and `initializeWand`. It does **not** call `beginScanning()` automatically on mount. The `InitializePage` component triggers NFC writes when the user clicks the initialize button. This is correct — unlike the consumer app, which starts scanning automatically, the management app only uses NFC on explicit user action.

If the refactor from the earlier guides has been applied, `useNfc` no longer exports `hasScannedWand` — that is fine, we are not using it here.

### Notes on `MagicBackground`

The management app uses `MagicBackground` for visual consistency with the main app. This is optional — if a simpler look is preferred, remove `MagicBackground` from the template and imports. The component is purely decorative.

---

## Step 4 — Update the Old Redirect Files

Two files in `public/` currently redirect to the old query-parameter-based pages. Update them to redirect to the management app instead.

### `website/public/configureSpot/index.html`

Replace the entire file contents with:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Magic Spot Configuration — Redirecting...</title>
    <script>
      (function() {
        // Redirect to the management app, which contains the spot configurator.
        // Resolve relative to this file's location to handle subpath deployments.
        const managementUrl = new URL("../../management/", window.location.href).toString();
        window.location.replace(managementUrl);
      })();
    </script>
  </head>
  <body>
    <p>Redirecting to Management App...</p>
  </body>
</html>
```

### `website/public/initialize/index.html`

Replace the entire file contents with:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Wand Workshop — Redirecting...</title>
    <script>
      (function() {
        // Redirect to the management app, which contains the wand initializer.
        // Resolve relative to this file's location to handle subpath deployments.
        const managementUrl = new URL("../../management/", window.location.href).toString();
        window.location.replace(managementUrl);
      })();
    </script>
  </head>
  <body>
    <p>Redirecting to Management App...</p>
  </body>
</html>
```

### Why `../../management/`

These redirect files are served from `/configureSpot/index.html` and `/initialize/index.html` (one level deep from the root). `../../management/` goes up two levels (to root) then into `management/`. The `new URL(...)` constructor resolves this relative path against `window.location.href`, which correctly handles any subpath deployment.

---

## Verification Checklist

After completing all steps in this phase:

- [ ] `website/management/index.html` exists with correct `../` paths to assets
- [ ] `website/src/management/main.ts` exists and imports `../style.css`
- [ ] `website/src/management/ManagementApp.vue` exists
- [ ] `ManagementApp.vue` imports `InitializePage`, `ConfigureSpotPage`, `MagicBackground`, `useNfc`, `resolveAppUrl`
- [ ] `ManagementApp.vue` uses `resolveAppUrl("../")` for the back link (not hardcoded `/`)
- [ ] `website/public/configureSpot/index.html` redirects to `../../management/`
- [ ] `website/public/initialize/index.html` redirects to `../../management/`
- [ ] Run `npm run build` — must succeed with zero TypeScript errors
- [ ] `dist/management/index.html` exists in the build output
- [ ] In dev: navigate to `https://localhost:5173/management/` and confirm the management app loads
- [ ] In dev: the "← Hunt App" link navigates to the root `/`
- [ ] In dev: both tabs (Initialize Wand, Configure Spot) switch correctly
- [ ] In dev: the Initialize Wand tab shows the InitializePage component
- [ ] In dev: the Configure Spot tab shows the ConfigureSpotPage component
