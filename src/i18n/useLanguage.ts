import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";

import {
  applyLanguageAttributes,
  isLanguage,
  type Language,
} from "./index";

export function useLanguage() {
  const { i18n } = useTranslation();
  const activeLanguage = i18n.resolvedLanguage ?? i18n.language;
  const language: Language = isLanguage(activeLanguage)
    ? activeLanguage
    : "en";

  useEffect(() => {
    applyLanguageAttributes(language);
  }, [language]);

  const setLanguage = useCallback(
    (nextLanguage: Language) => {
      void i18n.changeLanguage(nextLanguage);
      applyLanguageAttributes(nextLanguage);
      try {
        localStorage.setItem("localserve-lang", nextLanguage);
      } catch {
        // Language still changes for this session when storage is unavailable.
      }
    },
    [i18n],
  );

  return { language, setLanguage };
}
