import { en } from "./en";
import { zh } from "./zh";

// Define the supported languages
type Language = {
  code: string;
  name: string;
  flag: string;
};

export const languages: Language[] = [
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
];

export type TranslationKeys = {
  common: Record<string, string>;
  table: Record<string, string>;
  type: Record<string, string>;
  invoice: Record<string, string>;
  vault: Record<string, string>;
  transaction: Record<string, string>;
  network: Record<string, string>;
  tax: Record<string, string>;
  errors: Record<string, string>;
};

type Translations = {
  en: TranslationKeys;
  zh: TranslationKeys;
};

// Import translations from separate files
export const translations: Translations = {
  en,
  zh,
};

// Get translation for a key with English fallback
export function getTranslation(languageCode: string, key: string): string {
  const keys = key.split(".");
  
  // Try to get translation in requested language
  let result: unknown = translations[languageCode as keyof Translations];
  
  for (const k of keys) {
    if (typeof result !== "object" || result === null) {
      // Fallback to English if translation not found
      result = translations.en;
      for (const fallbackKey of keys) {
        if (typeof result !== "object" || result === null) return key;
        result = (result as Record<string, unknown>)[fallbackKey];
      }
      return typeof result === "string" ? result : key;
    }
    result = (result as Record<string, string>)[k];
  }

  // If translation found, return it; otherwise fallback to English
  if (typeof result === "string") {
    return result;
  }
  
  // Fallback to English
  let englishResult: unknown = translations.en;
  for (const k of keys) {
    if (typeof englishResult !== "object" || englishResult === null) return key;
    englishResult = (englishResult as Record<string, unknown>)[k];
  }
  
  return typeof englishResult === "string" ? englishResult : key;
}
