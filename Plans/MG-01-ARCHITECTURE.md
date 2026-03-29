# MG-01 — Architecture

Read this document fully before touching any code. It explains exactly how Vite's multi-page app (MPA) feature works, what the final file structure looks like, and where each piece lives. Understanding this prevents the most common mistakes.

---

## How Vite MPA Works

Vite normally has one entry point: `website/index.html`. Everything in the project resolves from that root.

In MPA mode you register additional HTML files as entry points. Vite treats each one as the root of its own independent app. The key rule from Vite's official documentation is:

> "During dev, simply navigate or link to `/nested/` — it works as expected, just like a normal static file server."

This means:
- In development: navigate your browser to `https://localhost:5173/management/` and Vite serves `website/management/index.html`
- In production build: Vite outputs `dist/management/index.html` with correct asset paths

The `management/` folder must be **at the Vite project root** (alongside `index.html`), not inside `src/`. Vite's dev server maps URL paths directly to filesystem paths from the root.

---

## Final File Structure

Below is the complete set of files that will exist after all phases are complete. Files marked `NEW` are created by this guide. Files marked `UNCHANGED` already exist and are not modified. Files marked `EDITED` are modified.

```
website/                                    ← Vite project root (where vite.config.ts lives)
│
├── index.html                              UNCHANGED — main consumer app entry
│
├── management/                             NEW directory — management app entry
│   └── index.html                          NEW — management app HTML entry point
│
├── public/
│   ├── manifest.webmanifest               UNCHANGED — main app PWA manifest
│   ├── management-manifest.webmanifest    NEW — management app PWA manifest
│   ├── sw.js                              UNCHANGED — main app service worker
│   └── management-sw.js                   NEW — management app service worker
│
├── src/
│   ├── management/                         NEW directory — management app source
│   │   ├── main.ts                         NEW — Vue mount for management app
│   │   └── ManagementApp.vue              NEW — management app root component
│   │
│   ├── App.vue                             EDITED — initialize/configureSpot branches removed
│   ├── main.ts                             UNCHANGED
│   ├── style.css                           UNCHANGED — imported by both apps
│   │
│   ├── components/                         UNCHANGED — shared by both apps
│   │   ├── ConfigureSpotPage.vue           UNCHANGED (imported by management app)
│   │   ├── InitializePage.vue              UNCHANGED (imported by management app)
│   │   └── ... all other components ...   UNCHANGED
│   │
│   └── composables/                        UNCHANGED — shared by both apps
│       ├── useNfc.ts                       UNCHANGED
│       └── ... all other composables ...  UNCHANGED
│
└── vite.config.ts                          EDITED — add management entry point
```

---

## How the Two Apps Share Code

Both apps are compiled from the same `src/` directory. They share:

- All Vue components in `src/components/`
- All composables in `src/composables/`
- All utilities in `src/utils/`
- `src/style.css`
- All assets in `src/assets/`

Neither app "knows about" the other at runtime. They are independently mounted Vue apps. The sharing happens at **build time** — Vite compiles shared code once and both HTML entry points reference the same hashed asset chunks.

This means:
- No code duplication
- No imports between the two apps
- No shared runtime state between the apps

---

## What the Management App Contains

The management app is a minimal Vue app with:

1. A simple two-tab navigation (Initialize Wand / Configure Spot)
2. A "← Back to Hunt App" link to return to the main app
3. The existing `InitializePage.vue` component (unchanged)
4. The existing `ConfigureSpotPage.vue` component (unchanged)

The management app does **not** have:
- The bottom nav bar (`BottomNav.vue`)
- The hunt visualization
- The wand scan / hunt progress features
- The Toybox panel
- The archive
- The magic background (optional — see MG-03)

---

## Key Technical Constraint: `base: "./"` and Asset Paths

The existing `vite.config.ts` already sets `base: "./"`. This means all asset references in built HTML files are **relative** (e.g. `./assets/main.abc123.js` instead of `/assets/main.abc123.js`).

This is critical for GitHub Pages compatibility and it **already works correctly** for the MPA case because:

- `dist/index.html` references `./assets/...` — resolves to `dist/assets/...` ✓
- `dist/management/index.html` references `./assets/...` — resolves to `dist/management/assets/...` ✗

Wait — this would be wrong. Vite puts all assets in a **single** shared `dist/assets/` folder at the root, not per-page. With `base: "./"`, the management page's `./assets/` would be a broken relative path.

**This is the most important technical detail in this entire guide.**

The solution is already in use by the main app: `resolveAppUrl()` in `src/utils/appUrl.ts` resolves URLs relative to `document.baseURI`, which accounts for the page's actual location. The management app's `main.ts` and `ManagementApp.vue` must use this same utility whenever constructing absolute URLs (e.g. for the service worker registration).

For the HTML `<script>` and `<link>` tags that Vite injects automatically, Vite handles the relative paths correctly when `base: "./"` is set — it generates the right relative path from each HTML file to the shared `assets/` directory. So `dist/management/index.html` will contain `../assets/main.abc123.js` (going up one level), not `./assets/...`. This is automatic and correct.

**You do not need to do anything special about this.** Just be aware of it in case build output looks unexpected.

---

## Dev Server Behaviour

In development with `npm run dev`, Vite serves files from the project root. To access the management app:

```
https://localhost:5173/management/
```

Note the **trailing slash**. Without it, some versions of Vite may not fall back to `management/index.html`. Always use the trailing slash when navigating to the management app during development.

The main app is still at:

```
https://localhost:5173/
```

Both apps run from the same dev server on the same port. Hot module replacement (HMR) works for both.

---

## PWA Installability

Google's official guidance says same-origin path-scoped PWAs are "strongly discouraged" for true independence, because the browser won't fully consider them distinct apps — the outer app's service worker and manifest scope will capture the inner app's paths.

However:

- The management app has its own `management-manifest.webmanifest` with `scope: "./"` (relative to the manifest location, which puts it at `/management/`)
- The management app has its own service worker at `management-sw.js` registered with `scope: '/management/'`
- The `id` field in the manifest uniquely identifies a PWA to the browser, allowing two manifests on the same origin to be treated as separate installable apps.

In practice: an operator can navigate to `/management/` in Chrome on Android, open the browser menu, and tap "Add to Home Screen". This works. The automatic `beforeinstallprompt` banner may not fire because the main app is already installed, but manual installation via the browser menu works reliably.

This is acceptable. The audience for the management app is one or two people (whoever sets up spots and initializes wands). They will install it once via the browser menu and never need to do it again.

---

## What Happens to the Old URL Redirects

Currently, two files exist that redirect to the initialize and configureSpot pages:

- `website/public/configureSpot/index.html` — redirects to `/?configureSpot`
- `website/public/initialize/index.html` — redirects to `/?initialize`

After this work, these redirects will be updated to point to `/management/` instead. The management app will then use its own tab state to show the right tool. The old `?configureSpot` and `?initialize` query parameters will no longer be read by anything.

---

## Verification: What "Done" Looks Like

When all phases are complete:

1. `npm run build` succeeds with zero errors
2. `dist/index.html` exists (main app)
3. `dist/management/index.html` exists (management app)
4. Navigating to `/` in the built app shows the hunt UI with no initialize/configureSpot options
5. Navigating to `/management/` shows the management app with two tabs
6. Both apps share the same `dist/assets/` folder (no duplication)
7. The main app's bottom nav does **not** show on the management app
8. The management app has no hunt/archive/toybox content
