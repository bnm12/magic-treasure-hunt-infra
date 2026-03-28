import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import { resolveVersionedAppUrl } from "./utils/appUrl";

const app = createApp(App);
app.mount("#app");

// Register service worker for PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(resolveVersionedAppUrl("sw.js"))
      .catch((error: unknown) => {
        console.error("Service worker registration failed:", error);
      });
  });
}
