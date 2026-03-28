import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import mkcert from "vite-plugin-mkcert";

export default defineConfig({
  base: "/",
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
