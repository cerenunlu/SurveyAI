"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultLanguage, languageStorageKey, languages, translations, type Language } from "@/lib/i18n";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (path: string, values?: Record<string, string | number>) => string;
  tm: <T>(path: string) => T;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(defaultLanguage);

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(languageStorageKey);

    if (savedLanguage && isLanguage(savedLanguage)) {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(languageStorageKey, language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => {
    return {
      language,
      setLanguage,
      t: (path, values) => formatTranslation(readTranslation(path, translations[language] as Record<string, unknown>), values),
      tm: <T,>(path: string) => readTranslation(path, translations[language] as Record<string, unknown>) as T,
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider.");
  }

  return {
    language: context.language,
    setLanguage: context.setLanguage,
  };
}

export function useTranslations() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useTranslations must be used within LanguageProvider.");
  }

  return context;
}

function isLanguage(value: string): value is Language {
  return languages.includes(value as Language);
}

function readTranslation(path: string, tree: Record<string, unknown>): unknown {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object" || !(segment in current)) {
      throw new Error(`Missing translation key: ${path}`);
    }

    return (current as Record<string, unknown>)[segment];
  }, tree);
}

function formatTranslation(value: unknown, replacements?: Record<string, string | number>): string {
  if (typeof value !== "string") {
    throw new Error("Translation value is not a string.");
  }

  if (!replacements) {
    return value;
  }

  return Object.entries(replacements).reduce(
    (message, [key, replacement]) => message.replaceAll(`{{${key}}}`, String(replacement)),
    value,
  );
}
