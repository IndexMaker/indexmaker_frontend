// lib/types/currency.ts
// Currency and country type definitions

/**
 * Supported country codes
 */
export type CountryCode =
  | 'usa'
  | 'canada'
  | 'uk'
  | 'australia'
  | 'germany'
  | 'france'
  | 'japan'
  | 'india'
  | 'italy'
  | 'brazil';

/**
 * Currency codes corresponding to countries
 */
export type CurrencyCode = 'USD' | 'CAD' | 'GBP' | 'AUD' | 'EUR' | 'JPY' | 'INR' | 'BRL';

/**
 * Mapping of countries to their currencies
 */
export const COUNTRY_CURRENCY_MAP: Record<CountryCode, CurrencyCode> = {
  usa: 'USD',
  canada: 'CAD',
  uk: 'GBP',
  australia: 'AUD',
  germany: 'EUR',
  france: 'EUR',
  italy: 'EUR',
  japan: 'JPY',
  india: 'INR',
  brazil: 'BRL',
} as const;

/**
 * Currency display information
 */
export interface CurrencyInfo {
  readonly code: CurrencyCode;
  readonly symbol: string;
  readonly name: string;
  readonly decimals: number;
}

/**
 * Currency information lookup
 */
export const CURRENCY_INFO: Record<CurrencyCode, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', decimals: 2 },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', decimals: 2 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0 },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', decimals: 2 },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', decimals: 2 },
} as const;

/**
 * Get currency info for a country
 */
export function getCurrencyForCountry(country: CountryCode): CurrencyInfo {
  const currencyCode = COUNTRY_CURRENCY_MAP[country];
  return CURRENCY_INFO[currencyCode];
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, country: CountryCode): string {
  const currency = getCurrencyForCountry(country);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: currency.decimals,
    maximumFractionDigits: currency.decimals,
  }).format(amount);
}
