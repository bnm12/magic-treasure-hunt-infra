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
      // Watch src/ and public/ (hunt JSONs, images, sw.js, etc.)
      paths: ["src", "public"],
    },
  },
  build: {
    outDir: "dist",
  },
});
