import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import ur from "./locales/ur.json";
import urLatn from "./locales/ur-Latn.json";

export const supportedLanguages = ["en", "ur", "ur-Latn"] as const;
export type Language = (typeof supportedLanguages)[number];

export function isLanguage(
  value: string | null | undefined,
): value is Language {
  return supportedLanguages.some((language) => language === value);
}

function readInitialLanguage(): Language {
  try {
    const storedLanguage = localStorage.getItem("localserve-lang");
    return isLanguage(storedLanguage) ? storedLanguage : "en";
  } catch {
    return "en";
  }
}

export function applyLanguageAttributes(language: Language) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ur" ? "rtl" : "ltr";
}

const initialLanguage = readInitialLanguage();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ur: { translation: ur },
    "ur-Latn": { translation: urLatn },
  },
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

applyLanguageAttributes(initialLanguage);

export default i18n;
