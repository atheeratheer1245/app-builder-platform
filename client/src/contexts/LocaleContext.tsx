import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "ar" | "en";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  isArabic: boolean;
  copy: (ar: string, en: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const requested = new URLSearchParams(window.location.search).get("lang");
    if (requested === "en" || requested === "ar") return requested;
    const saved = localStorage.getItem("app-builder-locale");
    return saved === "en" ? "en" : "ar";
  });

  useEffect(() => {
    localStorage.setItem("app-builder-locale", locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    toggleLocale: () => setLocale(current => current === "ar" ? "en" : "ar"),
    isArabic: locale === "ar",
    copy: (ar, en) => locale === "ar" ? ar : en,
  }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useLocale must be used inside LocaleProvider");
  return value;
}
