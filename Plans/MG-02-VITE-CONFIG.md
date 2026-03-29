# MG-02 — Vite Config Change

## Goal

Register the management app's `index.html` as a second entry point in the Vite build. This is a one-file change.

## File to Edit

`website/vite.config.ts`

---

## Current State

The file currently looks like this:

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import mkcert from "vite-plugin-mkcert";

const buildId = process.env.BUILD_ID ?? new Date().toISOString();

export default defineConfig({
  base: "./",
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [vue(), mkcert()],
  server: {
    host: true,
    https: true,
    port: 5173,
    watch: {
      paths: ["src", "public"],
    },
  },
  build: {
    outDir: "dist",
  },
});
```

---

## Change

Add one import and modify the `build` section. Here is the complete file after the change:

```ts
import { defineConfig } from "vite";
import { resolve } from "node:path";
import vue from "@vitejs/plugin-vue";
import mkcert from "vite-plugin-mkcert";

const buildId = process.env.BUILD_ID ?? new Date().toISOString();

export default defineConfig({
  base: "./",
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
  },
  plugins: [vue(), mkcert()],
  server: {
    host: true,
    https: true,
    port: 5173,
    watch: {
      paths: ["src", "public"],
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        management: resolve(__dirname, "management/index.html"),
      },
    },
  },
});
```

### What changed

1. Added `import { resolve } from "node:path";` at the top.
2. Added `rollupOptions.input` to the `build` section, registering both HTML entry points as absolute paths.

### Why absolute paths

Vite requires absolute paths in `rollupOptions.input` for HTML files. The `resolve(__dirname, ...)` pattern creates an absolute path from the directory containing `vite.config.ts`. Since `vite.config.ts` is in `website/`, `resolve(__dirname, "management/index.html")` resolves to `website/management/index.html`.

### Why `node:path` not `path`

Using `node:path` (with the `node:` prefix) is the modern Node.js convention. It prevents any potential name collision with npm packages named `path`. Both work identically — use `node:path`.

---

## What This Does NOT Change

- `base: "./"` stays. Do not change it.
- The `server` config is unchanged.
- The `plugins` are unchanged — both apps benefit from Vue and mkcert.
- The `define` block is unchanged — `__APP_BUILD_ID__` is available to both apps.

---

## Important: The `management/index.html` File Does Not Exist Yet

This config change will cause `npm run build` to **fail** until `website/management/index.html` is created in MG-03. Do not try to run the build after this step alone.

The dev server (`npm run dev`) will still work for the main app even without the management HTML file — Vite only reads `rollupOptions.input` during build, not during dev for the non-entry files. But the management URL at `https://localhost:5173/management/` will 404 until the HTML file exists.

**Proceed immediately to MG-03.**

---

## Verification Checklist

After this step (and after MG-03 is also complete):

- [ ] `vite.config.ts` imports `resolve` from `node:path`
- [ ] `vite.config.ts` `build.rollupOptions.input` contains both `main` and `management` entries
- [ ] Both paths use `resolve(__dirname, ...)` with absolute path resolution
- [ ] `base: "./"` is unchanged
- [ ] `npm run build` succeeds (only after MG-03 is also complete)
- [ ] `dist/index.html` exists
- [ ] `dist/management/index.html` exists
