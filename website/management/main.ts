import { createApp } from "vue";
import ManagementApp from "../src/ManagementApp.vue";
import "../src/style.css";
import { i18n } from "../src/i18n";
import { resolveVersionedAppUrl } from "../src/utils/appUrl";

const app = createApp(ManagementApp);
app.use(i18n);
app.mount("#app");

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(resolveVersionedAppUrl("../management-sw.js"))
      .catch((error: unknown) => {
        console.error("Management service worker registration failed:", error);
      });
  });
}
