import { createApp } from "vue";
import ManagementApp from "./ManagementApp.vue";
import "./style.css";
import { i18n } from "./i18n";

// Register management-specific service worker for offline support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/management-sw.js")
      .then((registration) => {
        console.log("Management SW registered:", registration);
      })
      .catch((error) => {
        console.log("Management SW registration failed:", error);
      });
  });
}

const app = createApp(ManagementApp);
app.use(i18n);
app.mount("#app");
