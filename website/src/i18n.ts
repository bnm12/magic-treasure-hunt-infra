import { createI18n } from "vue-i18n";
import en from "./locales/en.json";
import da from "./locales/da.json";
import { detectLocale } from "./composables/useLocale";

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: "en",
  messages: { en, da },
});
