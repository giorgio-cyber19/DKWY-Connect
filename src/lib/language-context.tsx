"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { translate, type Language, type TranslationKey } from "./i18n";

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Starts "en" so server-rendered HTML and the first client render match
  // exactly (no hydration mismatch) — the real preference (localStorage or
  // navigator.language) is only knowable client-side, so it's applied a
  // moment later via this effect, same as ThemeProvider does for theme.
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const stored = window.localStorage.getItem("dwky-language");
    const valid = stored === "en" || stored === "nl" ? stored : null;
    const preferred = valid ?? (navigator.language.toLowerCase().startsWith("nl") ? "nl" : "en");
    setLanguageState(preferred);
    document.documentElement.setAttribute("lang", preferred);
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    document.documentElement.setAttribute("lang", next);
    window.localStorage.setItem("dwky-language", next);
  }, []);

  const t = useCallback((key: TranslationKey) => translate(language, key), [language]);

  // Unlike ThemeProvider, this context is consumed by pages rendered outside
  // any loading gate (login/setup/change-password, and AppShell's own splash)
  // — withholding the provider until mount would make every cold/hard load
  // of those pages throw in useLanguage(). Always provide a real value.
  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
