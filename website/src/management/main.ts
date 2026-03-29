import { createApp } from "vue";
import ManagementApp from "./ManagementApp.vue";
import "../style.css";
import { resolveVersionedAppUrl } from "../utils/appUrl";

const app = createApp(ManagementApp);
app.mount("#app");

// Register service worker for PWA support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(resolveVersionedAppUrl("management-sw.js"))
      .catch((error: unknown) => {
        console.error("Management service worker registration failed:", error);
      });
  });
}
