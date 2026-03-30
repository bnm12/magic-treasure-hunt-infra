// Hunt years are discovered at build/dev-server startup by scanning public/hunts/.
// Adding a new year only requires dropping a folder with hunt.json — no code changes needed.
// Note: if you add a hunt folder while the dev server is running, restart it to pick it up.
import { defineConfig } from "vite";
import { resolve } from "node:path";
import { readdirSync, existsSync } from "node:fs";
import vue from "@vitejs/plugin-vue";
import mkcert from "vite-plugin-mkcert";

function discoverHuntYears(publicDir: string): number[] {
  const huntsDir = resolve(publicDir, "hunts");
  if (!existsSync(huntsDir)) return [];
  return readdirSync(huntsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d{4}$/.test(d.name))
    .filter((d) => existsSync(resolve(huntsDir, d.name, "hunt.json")))
    .map((d) => Number(d.name))
    .sort((a, b) => b - a);
}

const buildId = process.env.BUILD_ID ?? new Date().toISOString();
const huntYears = discoverHuntYears(resolve(__dirname, "public"));

export default defineConfig({
  base: "./",
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildId),
    __HUNT_YEARS__: JSON.stringify(huntYears),
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
