# MG-07 — Complete File Reference and Final Checklist

## Purpose

This document is a complete reference of every file touched or created across all phases. Use it to verify nothing was missed before considering the work done.

---

## Files Created

| File | Phase | Contents |
|------|-------|----------|
| `website/management/index.html` | MG-03 | HTML entry point for management app |
| `website/management/management-manifest.webmanifest` | MG-04 | PWA manifest for management app |
| `website/management/management-sw.js` | MG-04 | Service worker for management app |
| `website/src/management/main.ts` | MG-03 | Vue createApp + SW registration |
| `website/src/management/ManagementApp.vue` | MG-03 | Root component: tabs, header, navigation |

---

## Files Edited

| File | Phase | What changed |
|------|-------|-------------|
| `website/vite.config.ts` | MG-02 | Added `rollupOptions.input` with both entry points; added `resolve` import |
| `website/src/App.vue` | MG-05 | Removed InitializePage and ConfigureSpotPage branches; removed BottomNav condition; removed related imports |
| `website/src/composables/useRouter.ts` | MG-05 | Removed initialize/configureSpot routing; trimmed PageName type (only if refactor Phase 3 was applied) |
| `website/public/configureSpot/index.html` | MG-03 | Redirects to `../../management/` |
| `website/public/initialize/index.html` | MG-03 | Redirects to `../../management/` |

---

## Files Unchanged

Everything not listed above is unchanged. In particular:

- `website/src/components/InitializePage.vue` — unchanged, still imported by management app
- `website/src/components/ConfigureSpotPage.vue` — unchanged, still imported by management app
- `website/src/composables/useNfc.ts` — unchanged
- `website/src/composables/useCommunication.ts` — unchanged
- `website/src/style.css` — unchanged, imported by both apps
- `website/src/utils/appUrl.ts` — unchanged, used by management app
- All other components and composables — unchanged
- `website/public/sw.js` — unchanged (main app SW)
- `website/public/manifest.webmanifest` — unchanged (main app manifest)
- `.github/workflows/website-static.yml` — unchanged

---

## Invariants: Things That Must Not Have Changed

After all phases, verify these are still true:

- [ ] The NFC data protocol is unchanged — MIME types, bitmask format, `x-hunt-meta`
- [ ] The main consumer app shows Hunt, Archive, and Toybox — no management tools
- [ ] `style.css` CSS variables, animations, and utility classes are unchanged
- [ ] The hunt JSON asset files in `public/hunts/` are unchanged
- [ ] The Arduino firmware is unchanged

---

## Complete Final Checklist

Run through this list top to bottom after completing all phases.

### Build

- [ ] `npm run build` succeeds with zero TypeScript errors and zero warnings
- [ ] `dist/index.html` exists
- [ ] `dist/management/index.html` exists
- [ ] `dist/management/management-manifest.webmanifest` exists
- [ ] `dist/management/management-sw.js` exists
- [ ] `dist/assets/` is a single shared folder (both apps use the same chunk files)
- [ ] `dist/hunts/` exists with hunt assets intact

### Main App (dev server or built)

- [ ] Navigating to `/` shows the main app
- [ ] The main app shows three nav tabs: Hunt, Archive, Toybox
- [ ] The main app does NOT have an Initialize or Configure Spot option anywhere
- [ ] Navigating to `/?initialize` loads the main app normally (query param silently ignored)
- [ ] Navigating to `/?configureSpot` loads the main app normally (query param silently ignored)
- [ ] The main app's NFC scan and hunt visualization work correctly
- [ ] The Toybox panel works correctly (record 1 writing, wand initialization)
- [ ] The main app PWA manifest still loads (`manifest.webmanifest`)
- [ ] The main app service worker still registers (`sw.js`)

### Management App (dev server or built)

- [ ] Navigating to `/management/` shows the management app
- [ ] The management app header shows "Management" title and "← Hunt App" back link
- [ ] The "← Hunt App" back link navigates to `/` (or correct subpath root on GitHub Pages)
- [ ] The management app shows two tabs: "Initialize Wand" and "Configure Spot"
- [ ] Clicking "Initialize Wand" shows the InitializePage component
- [ ] Clicking "Configure Spot" shows the ConfigureSpotPage component
- [ ] Switching between tabs works and shows a transition
- [ ] The management app does NOT show the bottom nav bar
- [ ] The management app does NOT show hunt/archive/Toybox content
- [ ] The management PWA manifest loads correctly (Chrome DevTools → Application → Manifest shows "Tryllestav Management")
- [ ] The management service worker registers (Chrome DevTools → Application → Service Workers shows `management-sw.js`)
- [ ] The management app can be added to the home screen via browser menu

### Redirect files

- [ ] Navigating to `/configureSpot/` redirects to `/management/`
- [ ] Navigating to `/initialize/` redirects to `/management/`

### GitHub Pages (if deployed)

- [ ] The main app loads at the root URL
- [ ] The management app loads at `/management/` (or `[repo-name]/management/`)
- [ ] Both apps' assets load without 404 errors

---

## Troubleshooting

### "Management app loads at /management/ in dev but shows blank page in production"

This almost always means a path resolution issue. Check:

1. `dist/management/index.html` exists — if not, the Vite config entry point is wrong
2. The `<script>` tag in the built `dist/management/index.html` — it should reference `../assets/...` (relative, going up one level). If it shows `/assets/...` (absolute), the `base: "./"` config is not being applied
3. Open browser DevTools Network tab — which requests are 404ing?

### "Management service worker fails to register"

Check the registration URL in `main.ts`. The `resolveVersionedAppUrl("management-sw.js")` call must resolve to `/management/management-sw.js`. If it resolves to `/management-sw.js` (missing the directory), there is a base URI resolution issue.

In browser DevTools Console, add a temporary log:
```ts
console.log("SW URL:", resolveVersionedAppUrl("management-sw.js"));
```
Verify the logged URL is correct.

### "Chrome won't show 'Add to Home Screen' for the management app"

This is expected if the main app is already installed. Chrome will not auto-prompt for a second PWA on the same origin. To install manually:
1. Navigate to `/management/` in Chrome on Android
2. Tap the three-dot menu
3. Tap "Add to Home screen" or "Install app"

### "TypeScript error: 'initializeYear' is not defined"

This means you destructured `initializeYear` from `useRouter()` somewhere but `useRouter()` no longer returns it. Find all uses of `initializeYear` in `App.vue` and remove them — it was only needed for the `InitializePage` prop which is now gone.

### "TypeScript error: Type '"initialize"' is not assignable to type 'PageName'"

`PageName` in `useRouter.ts` no longer includes `"initialize"`. Search for any remaining code that sets `currentPage.value = "initialize"` or `currentPage.value = "configureSpot"` and remove it.
