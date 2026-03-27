import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
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
