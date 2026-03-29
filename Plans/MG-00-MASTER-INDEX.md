# Management App — Master Index

## What We Are Building

A second, self-contained Vue 3 app that lives at `/management/` within the same Vite project. It gives spot operators a focused UI for two tools:

- **Initialize Wand** — write metadata to a blank NFC tag
- **Configure Spot** — connect to a spot device over USB or Bluetooth and set its spot ID and hunt year

These tools currently live inside the main consumer app (`App.vue`) and are reached via special URL parameters (`?initialize`, `?configureSpot`). After this work:

- The main consumer app no longer contains those pages at all
- The management app is a completely separate Vue entry point
- Both apps share components, composables, styles, and assets from `src/`
- The management app can be bookmarked or added to the home screen independently

---

## Document Index

| # | Document | What it covers |
|---|----------|---------------|
| 01 | `MG-01-ARCHITECTURE.md` | How Vite MPA works, file layout, what to expect at the end |
| 02 | `MG-02-VITE-CONFIG.md` | The one config change needed to register the second entry |
| 03 | `MG-03-MANAGEMENT-APP-FILES.md` | Create all new files for the management app |
| 04 | `MG-04-MANIFEST-AND-SW.md` | PWA manifest and service worker for the management app |
| 05 | `MG-05-STRIP-MAIN-APP.md` | Remove the two pages from the main consumer app |
| 06 | `MG-06-GITHUB-ACTIONS.md` | Update the GitHub Actions workflow if needed |

---

## Execute in Order

**Do not skip phases.** Each phase assumes the previous one is complete.

After each phase, run:

```bash
cd website
npm run build
```

It must succeed with zero TypeScript errors before moving on.

---

## Hard Constraints — Read Before Starting

These rules apply across all phases. Violating any of them will break something.

1. **Do not move any `.vue` components or composables.** Both apps import from `src/components/` and `src/composables/` in place. No files move.
2. **Do not change `vite.config.ts` `base` setting.** It is already `"./"` (relative). This is correct and must stay.
3. **Do not change any NFC protocol logic** — MIME types, bitmask encoding, `x-hunt-meta` format — anywhere.
4. **Do not change `style.css`.** Both apps import it.
5. **Do not add a router library** (Vue Router, etc.). The management app has exactly two tabs and uses a simple `ref` for tab state, just like the current main app uses `ref` for page state.
6. **The `management/` folder lives at the Vite project root** (`website/management/`), not inside `src/`. This is required for Vite's MPA dev server to serve it at `/management/`.

---

## What the End State Looks Like

**URLs:**

| URL | What you see |
|-----|-------------|
| `/` or `/index.html` | Main consumer hunt app (unchanged) |
| `/management/` | Management app — Initialize Wand tab |
| `/management/index.html` | Same as above |

**Installed PWAs (via browser "Add to Home Screen"):**

| App name | Start URL | Can be installed |
|----------|-----------|-----------------|
| Tryllestavsprojekt | `/` | Yes (already works) |
| Tryllestav Management | `/management/` | Yes (via browser menu) |

Note: The browser will not auto-prompt installation for the management app while you are browsing the main app. The operator must navigate to `/management/` and use the browser menu ("Add to Home Screen" / "Install app") manually. This is expected and acceptable — operators are not kids.
