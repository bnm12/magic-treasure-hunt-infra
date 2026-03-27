import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [vue(), basicSsl()],
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
