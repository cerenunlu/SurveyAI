import { en } from "@/lib/i18n/en";
import { tr } from "@/lib/i18n/tr";

export const languages = ["tr", "en"] as const;

export type Language = (typeof languages)[number];

export const defaultLanguage: Language = "tr";
export const languageStorageKey = "surveyai-language";

export const translations = {
  tr,
  en,
} as const;

export type TranslationTree = (typeof translations)[typeof defaultLanguage];
