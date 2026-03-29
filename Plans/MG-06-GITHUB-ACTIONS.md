# MG-06 — GitHub Actions Workflow

## Goal

Verify the existing GitHub Actions deployment workflow handles the MPA build correctly and update it if needed.

---

## Read the Current Workflow First

The current workflow is at `.github/workflows/website-static.yml`. It currently looks like:

```yaml
name: Build and Deploy Website

on:
  push:
    branches:
      - main
    paths:
      - website/**
      - .github/workflows/website-static.yml
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: website

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: website/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Build static site
        run: npm run build

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: website/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

## Does It Need Changes?

**No changes are required** to the workflow. Here is why:

1. `npm run build` runs `tsc && vite build` from `website/`. The updated `vite.config.ts` (from MG-02) tells Vite to build both entry points. Both `dist/index.html` and `dist/management/index.html` are produced in the same `dist/` folder.

2. `actions/upload-pages-artifact@v3` uploads the entire `website/dist` folder. Since `dist/management/` is inside `dist/`, it is included automatically.

3. GitHub Pages serves the uploaded folder as a static site. Both `/` and `/management/` are accessible.

The workflow path trigger `paths: website/**` already covers all new files added under `website/` (including `website/management/`).

---

## One Potential Issue: GitHub Pages Repo Subpath

If this repository is hosted on GitHub Pages under a **repo subpath** (e.g. `https://username.github.io/Tryllestavsprojekt/`), the existing `base: "./"` config in `vite.config.ts` already handles this correctly — all asset paths are relative, not absolute.

The management app at `/Tryllestavsprojekt/management/` will work correctly because:

- All asset references in `dist/management/index.html` use relative paths (`../assets/...`)
- `resolveAppUrl("../")` in `ManagementApp.vue` uses `document.baseURI` which respects the actual deployment URL
- The service worker registration uses `resolveVersionedAppUrl("management-sw.js")` which also uses `document.baseURI`

No workflow changes are needed for subpath deployments.

---

## Verify the Build Output Structure

After running `npm run build` locally, confirm the `dist/` folder structure looks like this:

```
dist/
├── index.html                           ← main app
├── management/
│   ├── index.html                       ← management app
│   ├── management-manifest.webmanifest  ← management PWA manifest
│   └── management-sw.js                 ← management service worker
├── assets/
│   ├── main.[hash].js                   ← shared JS chunks
│   ├── management.[hash].js             ← management-specific chunk (if Rollup splits it)
│   └── ...
├── manifest.webmanifest                 ← main app PWA manifest
├── sw.js                                ← main app service worker
├── icon-192.png
├── icon-512.png
├── icon-maskable-192.png
├── icon-maskable-512.png
├── apple-touch-icon.png
├── favicon.svg
└── hunts/
    └── ...                              ← hunt assets (unchanged)
```

Key things to confirm:
- Both `index.html` files exist at their correct paths
- `dist/management/management-manifest.webmanifest` and `dist/management/management-sw.js` exist
- The `assets/` folder is shared (not duplicated per app)
- The `hunts/` folder is present (public assets copied correctly)

---

## Verification Checklist

- [ ] The GitHub Actions workflow file is **unchanged**
- [ ] Run `npm run build` locally and confirm `dist/management/index.html` exists
- [ ] Run `npm run build` locally and confirm `dist/management/management-manifest.webmanifest` exists
- [ ] Run `npm run build` locally and confirm `dist/management/management-sw.js` exists
- [ ] Confirm `dist/assets/` is a single shared folder (not duplicated)
- [ ] If testing on GitHub Pages: navigate to `[your-pages-url]/management/` and confirm the management app loads
