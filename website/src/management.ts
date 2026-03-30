import { createApp } from "vue";
import ManagementApp from "./ManagementApp.vue";
import "./style.css";
import { i18n } from "./i18n";

const app = createApp(ManagementApp);
app.use(i18n);
app.mount("#app");
