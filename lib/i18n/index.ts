// Define the supported languages
type Language = {
  code: string;
  name: string;
  flag: string;
};

export const languages: Language[] = [
  { code: "en", name: "English", flag: "🇬🇧" },
];

export type TranslationKeys = {
  common: Record<string, string>;
  table: Record<string, string>;
  type: Record<string, string>;
  ecosystem: Record<string, string>;
  subscribe: Record<string, string>;
};

type Translations = {
  en: TranslationKeys;
};

// Define the translations
const translations: Translations = {
  en: {
    common: {
      dashboard: "Dashboard",
      connectWallet: "Connect Wallet",
      disconnect: "Disconnect",
      analytics: "Analytics",
      ecosystem: "Ecosystem",
      curators: "Curators",
      taxCalculator: "Tax Calculator",
      submit: "Submit",
      cancel: "Cancel",
      save: "Save",
      loading: "Loading...",
      error: "Error",
      success: "Success",
    },
    table: {
      name: "Name",
      symbol: "Symbol",
      price: "Price",
      change: "Change",
      volume: "Volume",
    },
    type: {
      buy: "Buy",
      sell: "Sell",
      deposit: "Deposit",
      withdraw: "Withdraw",
    },
    ecosystem: {
      title: "Ecosystem",
      description: "Explore the ecosystem",
    },
    subscribe: {
      title: "Subscribe",
      description: "Subscribe to updates",
    },
  },
};

// Get translation for a key
export function getTranslation(language: string, key: string): string {
  const keys = key.split(".");
  let result: unknown = translations[language as keyof Translations];

  for (const k of keys) {
    if (typeof result !== "object" || result === null) return key;
    result = (result as Record<string, unknown>)[k];
  }

  return typeof result === "string" ? result : key;
}
