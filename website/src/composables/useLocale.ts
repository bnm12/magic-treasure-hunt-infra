import { i18n } from "../i18n";

const STORAGE_KEY = "tryllestav-locale";
const SUPPORTED_LOCALES = ["en", "da"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/**
 * Detects the preferred locale in priority order:
 * 1. Previously saved preference in localStorage
 * 2. Browser language (navigator.language, stripped to base tag e.g. "da-DK" -> "da")
 * 3. English fallback
 */
export function detectLocale(): SupportedLocale {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && isSupportedLocale(saved)) return saved;

  const browserLang = navigator.language?.split("-")[0]?.toLowerCase() ?? "";
  if (isSupportedLocale(browserLang)) return browserLang;

  return "en";
}

/**
 * Returns helpers for reading and changing the active locale.
 * Operates on the shared i18n instance.
 */
export function useLocale() {
  function setLocale(locale: SupportedLocale) {
    i18n.global.locale.value = locale;
    localStorage.setItem(STORAGE_KEY, locale);
  }

  function currentLocale(): SupportedLocale {
    const val = i18n.global.locale.value;
    return isSupportedLocale(val) ? val : "en";
  }

  return {
    setLocale,
    currentLocale,
    supportedLocales: SUPPORTED_LOCALES,
  };
}
