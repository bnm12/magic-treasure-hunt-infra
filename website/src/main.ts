import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";
import { i18n } from "./i18n";
import { createNfcStore, NFC_STORE_KEY } from "./composables/useNfc";

const app = createApp(App);
app.use(i18n);
app.provide(NFC_STORE_KEY, createNfcStore());
app.mount("#app");
