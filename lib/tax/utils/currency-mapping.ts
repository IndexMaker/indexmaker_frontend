// lib/tax/utils/currency-mapping.ts
// Comprehensive currency mapping system for all 53 countries

export interface CurrencyInfo {
  code: string;           // ISO 4217 currency code
  symbol: string;         // Currency symbol
  name: string;          // Full currency name
  decimals: number;      // Number of decimal places
  locale: string;        // Locale for number formatting
  position: 'before' | 'after'; // Symbol position
}

// Comprehensive currency mapping for all 53 countries
export const CURRENCY_MAPPING: Record<string, CurrencyInfo> = {
  // North America
  usa: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    decimals: 2,
    locale: 'en-US',
    position: 'before'
  },
  canada: {
    code: 'CAD',
    symbol: 'C$',
    name: 'Canadian Dollar',
    decimals: 2,
    locale: 'en-CA',
    position: 'before'
  },
  mexico: {
    code: 'MXN',
    symbol: '$',
    name: 'Mexican Peso',
    decimals: 2,
    locale: 'es-MX',
    position: 'before'
  },

  // Europe
  germany: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    locale: 'de-DE',
    position: 'after'
  },
  france: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    locale: 'fr-FR',
    position: 'after'
  },
  italy: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    locale: 'it-IT',
    position: 'after'
  },
  spain: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    locale: 'es-ES',
    position: 'after'
  },
  netherlands: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    locale: 'nl-NL',
    position: 'after'
  },
  belgium: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    locale: 'nl-BE',
    position: 'after'
  },
  austria: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    locale: 'de-AT',
    position: 'after'
  },
  finland: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    locale: 'fi-FI',
    position: 'after'
  },
  ireland: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    locale: 'en-IE',
    position: 'after'
  },
  portugal: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    locale: 'pt-PT',
    position: 'after'
  },
  greece: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    decimals: 2,
    locale: 'el-GR',
    position: 'after'
  },
  uk: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    decimals: 2,
    locale: 'en-GB',
    position: 'before'
  },
  switzerland: {
    code: 'CHF',
    symbol: 'CHF',
    name: 'Swiss Franc',
    decimals: 2,
    locale: 'de-CH',
    position: 'after'
  },
  norway: {
    code: 'NOK',
    symbol: 'kr',
    name: 'Norwegian Krone',
    decimals: 2,
    locale: 'nb-NO',
    position: 'after'
  },
  sweden: {
    code: 'SEK',
    symbol: 'kr',
    name: 'Swedish Krona',
    decimals: 2,
    locale: 'sv-SE',
    position: 'after'
  },
  denmark: {
    code: 'DKK',
    symbol: 'kr',
    name: 'Danish Krone',
    decimals: 2,
    locale: 'da-DK',
    position: 'after'
  },
  poland: {
    code: 'PLN',
    symbol: 'zł',
    name: 'Polish Zloty',
    decimals: 2,
    locale: 'pl-PL',
    position: 'after'
  },
  czechrepublic: {
    code: 'CZK',
    symbol: 'Kč',
    name: 'Czech Koruna',
    decimals: 2,
    locale: 'cs-CZ',
    position: 'after'
  },
  romania: {
    code: 'RON',
    symbol: 'lei',
    name: 'Romanian Leu',
    decimals: 2,
    locale: 'ro-RO',
    position: 'after'
  },

  // Asia-Pacific
  japan: {
    code: 'JPY',
    symbol: 'JPY',
    name: 'Japanese Yen',
    decimals: 0,
    locale: 'ja-JP',
    position: 'before'
  },
  china: {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Yuan',
    decimals: 2,
    locale: 'zh-CN',
    position: 'before'
  },
  india: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    decimals: 2,
    locale: 'en-IN',
    position: 'before'
  },
  southkorea: {
    code: 'KRW',
    symbol: '₩',
    name: 'South Korean Won',
    decimals: 0,
    locale: 'ko-KR',
    position: 'before'
  },
  australia: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    decimals: 2,
    locale: 'en-AU',
    position: 'before'
  },
  singapore: {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    decimals: 2,
    locale: 'en-SG',
    position: 'before'
  },
  hongkong: {
    code: 'HKD',
    symbol: 'HK$',
    name: 'Hong Kong Dollar',
    decimals: 2,
    locale: 'en-HK',
    position: 'before'
  },
  taiwan: {
    code: 'TWD',
    symbol: 'NT$',
    name: 'Taiwan Dollar',
    decimals: 2,
    locale: 'zh-TW',
    position: 'before'
  },
  thailand: {
    code: 'THB',
    symbol: '฿',
    name: 'Thai Baht',
    decimals: 2,
    locale: 'th-TH',
    position: 'before'
  },
  malaysia: {
    code: 'MYR',
    symbol: 'RM',
    name: 'Malaysian Ringgit',
    decimals: 2,
    locale: 'ms-MY',
    position: 'before'
  },
  indonesia: {
    code: 'IDR',
    symbol: 'Rp',
    name: 'Indonesian Rupiah',
    decimals: 0,
    locale: 'id-ID',
    position: 'before'
  },
  philippines: {
    code: 'PHP',
    symbol: '₱',
    name: 'Philippine Peso',
    decimals: 2,
    locale: 'en-PH',
    position: 'before'
  },
  vietnam: {
    code: 'VND',
    symbol: '₫',
    name: 'Vietnamese Dong',
    decimals: 0,
    locale: 'vi-VN',
    position: 'after'
  },

  // Middle East & Africa
  uae: {
    code: 'AED',
    symbol: 'د.إ',
    name: 'UAE Dirham',
    decimals: 2,
    locale: 'ar-AE',
    position: 'before'
  },
  saudiarabia: {
    code: 'SAR',
    symbol: '﷼',
    name: 'Saudi Riyal',
    decimals: 2,
    locale: 'ar-SA',
    position: 'before'
  },
  israel: {
    code: 'ILS',
    symbol: '₪',
    name: 'Israeli Shekel',
    decimals: 2,
    locale: 'he-IL',
    position: 'before'
  },
  turkey: {
    code: 'TRY',
    symbol: '₺',
    name: 'Turkish Lira',
    decimals: 2,
    locale: 'tr-TR',
    position: 'before'
  },
  iran: {
    code: 'IRR',
    symbol: '﷼',
    name: 'Iranian Rial',
    decimals: 0,
    locale: 'fa-IR',
    position: 'before'
  },
  iraq: {
    code: 'IQD',
    symbol: 'ع.د',
    name: 'Iraqi Dinar',
    decimals: 3,
    locale: 'ar-IQ',
    position: 'before'
  },
  egypt: {
    code: 'EGP',
    symbol: '£',
    name: 'Egyptian Pound',
    decimals: 2,
    locale: 'en-EG', // Use English locale for Egypt to display Latin numerals instead of Arabic numerals
    position: 'before'
  },
  southafrica: {
    code: 'ZAR',
    symbol: 'R',
    name: 'South African Rand',
    decimals: 2,
    locale: 'en-ZA',
    position: 'before'
  },
  algeria: {
    code: 'DZD',
    symbol: 'د.ج',
    name: 'Algerian Dinar',
    decimals: 2,
    locale: 'ar-DZ',
    position: 'before'
  },

  // South America
  brazil: {
    code: 'BRL',
    symbol: 'R$',
    name: 'Brazilian Real',
    decimals: 2,
    locale: 'pt-BR',
    position: 'before'
  },
  argentina: {
    code: 'ARS',
    symbol: '$',
    name: 'Argentine Peso',
    decimals: 2,
    locale: 'es-AR',
    position: 'before'
  },
  chile: {
    code: 'CLP',
    symbol: '$',
    name: 'Chilean Peso',
    decimals: 0,
    locale: 'es-CL',
    position: 'before'
  },
  colombia: {
    code: 'COP',
    symbol: '$',
    name: 'Colombian Peso',
    decimals: 2,
    locale: 'es-CO',
    position: 'before'
  },
  peru: {
    code: 'PEN',
    symbol: 'S/',
    name: 'Peruvian Sol',
    decimals: 2,
    locale: 'es-PE',
    position: 'before'
  },

  // Other regions
  russia: {
    code: 'RUB',
    symbol: '₽',
    name: 'Russian Ruble',
    decimals: 2,
    locale: 'ru-RU',
    position: 'after'
  },
  kazakhstan: {
    code: 'KZT',
    symbol: '₸',
    name: 'Kazakhstani Tenge',
    decimals: 2,
    locale: 'kk-KZ',
    position: 'after'
  },
  bangladesh: {
    code: 'BDT',
    symbol: '৳',
    name: 'Bangladeshi Taka',
    decimals: 2,
    locale: 'bn-BD',
    position: 'before'
  },
  pakistan: {
    code: 'PKR',
    symbol: '₨',
    name: 'Pakistani Rupee',
    decimals: 2,
    locale: 'ur-PK',
    position: 'before'
  }
};

// Helper function to get currency info for a country
export function getCurrencyInfo(countryKey: any): CurrencyInfo {
  return CURRENCY_MAPPING[countryKey] || CURRENCY_MAPPING.usa; // Fallback to USD
}

// Get all unique currencies
export function getUniqueCurrencies(): CurrencyInfo[] {
  const seen = new Set<string>();
  return Object.values(CURRENCY_MAPPING).filter(currency => {
    if (seen.has(currency.code)) return false;
    seen.add(currency.code);
    return true;
  });
}

// Group countries by currency
export function getCountriesByCurrency(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  
  Object.entries(CURRENCY_MAPPING).forEach(([country, currency]) => {
    if (!result[currency.code]) {
      result[currency.code] = [];
    }
    result[currency.code].push(country);
  });
  
  return result;
}
