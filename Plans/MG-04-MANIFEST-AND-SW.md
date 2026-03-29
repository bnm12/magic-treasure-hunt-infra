# MG-04 — PWA Manifest and Service Worker

## Goal

Give the management app its own PWA identity so it can be added to the home screen independently of the main app. This requires two new files in `website/public/`.

---

## Files to Create

| File | Purpose |
|------|---------|
| `website/public/management-manifest.webmanifest` | PWA manifest for the management app |
| `website/public/management-sw.js` | Service worker for the management app |

---

## Step 1 — Create `management-manifest.webmanifest`

**File path:** `website/public/management-manifest.webmanifest`

```json
{
  "id": "/management/",
  "name": "Tryllestav Management",
  "short_name": "Stav Admin",
  "description": "Initialize wands and configure magic spots for Tryllestavsprojekt.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#0b0b1a",
  "background_color": "#0b0b1a",
  "icons": [
    {
      "src": "../icon-192.png",
      "type": "image/png",
      "sizes": "192x192",
      "purpose": "any"
    },
    {
      "src": "../icon-512.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "any"
    },
    {
      "src": "../icon-maskable-192.png",
      "type": "image/png",
      "sizes": "192x192",
      "purpose": "maskable"
    },
    {
      "src": "../icon-maskable-512.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "maskable"
    }
  ]
}
```

### Key fields explained

**`"id": "/management/"`**

This is the unique identifier the browser uses to distinguish this PWA from the main app. The `id` field was introduced in Chrome 96. Without it, the browser falls back to using `start_url` as the identity, which can lead to the main app and management app being treated as the same installable app. With an explicit `id`, they are always treated as distinct apps.

The value `/management/` is an absolute path (note the leading slash). This is intentional — the `id` must be absolute and on the same origin.

**`"start_url": "./"` and `"scope": "./"`**

Both are relative paths. When a manifest file is served from `/management-manifest.webmanifest` (because `public/` files are served from root), `"./"` means the root `/`. That would be wrong — it would scope the management app to the entire site, overlapping with the main app.

**HOWEVER:** this manifest is linked from `/management/index.html` with:
```html
<link rel="manifest" href="../management-manifest.webmanifest" />
```

The `../management-manifest.webmanifest` resolves to the root `/management-manifest.webmanifest`. The browser resolves `start_url` and `scope` relative to the **manifest's own URL**, not relative to the page. So when the manifest is at `/management-manifest.webmanifest`, `"./"` resolves to `/` (the root).

This is still wrong for what we want. We want the scope to be `/management/`.

**The correct fix:** Use paths relative to where the manifest file will actually be accessed from. Since the manifest is served at `/management-manifest.webmanifest` (root level), we need to use an explicit path for `start_url` and `scope`:

```json
{
  "start_url": "/management/",
  "scope": "/management/"
}
```

But this will break on GitHub Pages where the site is deployed at a subpath like `/repo-name/management/`.

**The GitHub Pages-safe fix:** Keep `"./"` but understand the manifest needs to be co-located with the HTML it serves. Instead of putting the manifest in `public/` (which serves it from root), we need it to be served from `/management/`.

The cleanest solution for this project is to put the manifest file inside the `management/` directory at the project root:

---

### CORRECTION: Manifest file location

Do **not** put the manifest in `website/public/management-manifest.webmanifest`.

Instead, create it at:

**`website/management/management-manifest.webmanifest`**

This file lives alongside `management/index.html`. Vite will include it in the build output at `dist/management/management-manifest.webmanifest`.

And update the `<link>` tag in `management/index.html` to:

```html
<link rel="manifest" href="management-manifest.webmanifest" />
```

(No `../` prefix — the manifest is in the same directory as the HTML file.)

Now `start_url: "./"` and `scope: "./"` both resolve to `/management/` because the manifest is served from `/management/management-manifest.webmanifest`. This is correct and works on any deployment subpath.

---

### Updated file contents

**File path:** `website/management/management-manifest.webmanifest`

```json
{
  "id": "management",
  "name": "Tryllestav Management",
  "short_name": "Stav Admin",
  "description": "Initialize wands and configure magic spots for Tryllestavsprojekt.",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#0b0b1a",
  "background_color": "#0b0b1a",
  "icons": [
    {
      "src": "../icon-192.png",
      "type": "image/png",
      "sizes": "192x192",
      "purpose": "any"
    },
    {
      "src": "../icon-512.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "any"
    },
    {
      "src": "../icon-maskable-192.png",
      "type": "image/png",
      "sizes": "192x192",
      "purpose": "maskable"
    },
    {
      "src": "../icon-maskable-512.png",
      "type": "image/png",
      "sizes": "512x512",
      "purpose": "maskable"
    }
  ]
}
```

Note: `"id": "management"` (relative, no leading slash). When the manifest is served from `/management/management-manifest.webmanifest`, the browser resolves a relative `id` against the manifest URL's directory, giving a final computed ID of `/management/management`. This is distinct from the main app's ID and that is all that matters.

The `../icon-*.png` paths resolve to `/icon-*.png` (the root-level icons copied from `public/`), which is correct.

### Update `management/index.html`

Go back to `website/management/index.html` (created in MG-03) and change the manifest link:

```html
<!-- BEFORE (from MG-03) -->
<link rel="manifest" href="../management-manifest.webmanifest" />

<!-- AFTER -->
<link rel="manifest" href="management-manifest.webmanifest" />
```

---

## Step 2 — Create `management-sw.js`

The management app needs its own service worker to be installable as a separate PWA.

**File path:** `website/public/management-sw.js`

```js
const workerUrl = new URL(self.location.href);
const buildId = workerUrl.searchParams.get("v") ?? "dev";
const CACHE_NAME = `tryllestav-management-${buildId}`;
const APP_SCOPE = new URL("./", self.registration.scope);
const MANAGEMENT_URL = new URL("management/", APP_SCOPE).toString();
const INDEX_URL = new URL("management/index.html", APP_SCOPE).toString();

const APP_SHELL_ASSETS = [
  MANAGEMENT_URL,
  INDEX_URL,
  new URL("management/management-manifest.webmanifest", APP_SCOPE).toString(),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(async () => {
          const cachedPage = await caches.match(event.request);
          return cachedPage || caches.match(INDEX_URL);
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, responseClone));
          return networkResponse;
        })
        .catch(() => caches.match(INDEX_URL));
    }),
  );
});
```

### Why this service worker differs from `sw.js`

The main app's `sw.js` caches its own app shell assets (root `index.html`, root manifest, icons). The management SW caches the management app's shell assets (`management/index.html`, `management/management-manifest.webmanifest`). Both SWs are independent.

Note that the management SW is served from the root `/management-sw.js` (from `public/`), but it is registered with a scope. In `management/main.ts`, the registration call is:

```ts
navigator.serviceWorker.register(resolveVersionedAppUrl("management-sw.js"))
```

`resolveVersionedAppUrl("management-sw.js")` resolves relative to `document.baseURI`, which when loaded from `/management/` resolves to `/management/management-sw.js`.

**But the file is in `public/` and will be served at `/management-sw.js` (root level), not `/management/management-sw.js`.**

This is a path mismatch. Fix it by moving the service worker file:

**File path:** `website/management/management-sw.js`

Put the service worker in `website/management/` (alongside `index.html`), not in `public/`. Vite will include it in the build output at `dist/management/management-sw.js`.

Now `resolveVersionedAppUrl("management-sw.js")` (resolved from `document.baseURI` = `/management/`) correctly points to `/management/management-sw.js`.

---

### Summary: Both new files go in `website/management/`

To avoid any path confusion:

| File | Location | Served at |
|------|----------|-----------|
| `management-manifest.webmanifest` | `website/management/` | `/management/management-manifest.webmanifest` |
| `management-sw.js` | `website/management/` | `/management/management-sw.js` |

Both are in the same directory as `management/index.html`.

---

## Step 3 — Update `management/index.html` service worker note

No changes needed to the `management/index.html` regarding the SW — the SW registration is handled in `src/management/main.ts`, not in the HTML.

---

## Verification Checklist

After completing all steps in this phase:

- [ ] `website/management/management-manifest.webmanifest` exists
- [ ] `website/management/management-sw.js` exists
- [ ] `management/index.html` links to `href="management-manifest.webmanifest"` (no `../`)
- [ ] The manifest has `"id": "management"` (distinct from the main app)
- [ ] The manifest has `"start_url": "./"` and `"scope": "./"` (relative, resolved from manifest location)
- [ ] The manifest icon paths use `../icon-*.png` to reach the root-level icons
- [ ] Run `npm run build` — must succeed
- [ ] `dist/management/management-manifest.webmanifest` exists
- [ ] `dist/management/management-sw.js` exists
- [ ] In Chrome DevTools (Application → Manifest) at `/management/`: manifest loads and shows "Tryllestav Management"
- [ ] In Chrome DevTools (Application → Service Workers) at `/management/`: management-sw.js registers successfully
- [ ] The main app's manifest and SW are unaffected (check at `/`)
