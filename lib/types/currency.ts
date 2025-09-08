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
  | 'brazil'
  | 'algeria'
  | 'argentina'
  | 'austria'
  | 'bangladesh'
  | 'belgium'
  | 'chile'
  | 'china'
  | 'colombia'
  | 'czechrepublic'
  | 'denmark'
  | 'egypt'
  | 'finland'
  | 'greece'
  | 'hongkong'
  | 'indonesia'
  | 'iran'
  | 'iraq'
  | 'ireland'
  | 'israel'
  | 'kazakhstan'
  | 'malaysia'
  | 'mexico'
  | 'netherlands'
  | 'norway'
  | 'pakistan'
  | 'peru'
  | 'philippines'
  | 'poland'
  | 'portugal'
  | 'romania'
  | 'russia'
  | 'saudiarabia'
  | 'singapore'
  | 'southafrica'
  | 'southkorea'
  | 'spain'
  | 'sweden'
  | 'switzerland'
  | 'taiwan'
  | 'thailand'
  | 'turkey'
  | 'uae'
  | 'vietnam';

/**
 * Currency codes corresponding to countries
 */
export type CurrencyCode =
  | 'USD' | 'CAD' | 'GBP' | 'AUD' | 'EUR' | 'JPY' | 'INR' | 'BRL'
  | 'DZD' | 'ARS' | 'BDT' | 'CLP' | 'CNY' | 'COP' | 'CZK' | 'DKK'
  | 'EGP' | 'HKD' | 'IDR' | 'IRR' | 'IQD' | 'ILS' | 'KZT' | 'MYR'
  | 'MXN' | 'NOK' | 'PKR' | 'PEN' | 'PHP' | 'PLN' | 'RON' | 'RUB'
  | 'SAR' | 'SGD' | 'ZAR' | 'KRW' | 'SEK' | 'CHF' | 'TWD' | 'THB'
  | 'TRY' | 'AED' | 'VND';

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
  algeria: 'DZD',
  argentina: 'ARS',
  austria: 'EUR',
  bangladesh: 'BDT',
  belgium: 'EUR',
  chile: 'CLP',
  china: 'CNY',
  colombia: 'COP',
  czechrepublic: 'CZK',
  denmark: 'DKK',
  egypt: 'EGP',
  finland: 'EUR',
  greece: 'EUR',
  hongkong: 'HKD',
  indonesia: 'IDR',
  iran: 'IRR',
  iraq: 'IQD',
  ireland: 'EUR',
  israel: 'ILS',
  kazakhstan: 'KZT',
  malaysia: 'MYR',
  mexico: 'MXN',
  netherlands: 'EUR',
  norway: 'NOK',
  pakistan: 'PKR',
  peru: 'PEN',
  philippines: 'PHP',
  poland: 'PLN',
  portugal: 'EUR',
  romania: 'RON',
  russia: 'RUB',
  saudiarabia: 'SAR',
  singapore: 'SGD',
  southafrica: 'ZAR',
  southkorea: 'KRW',
  spain: 'EUR',
  sweden: 'SEK',
  switzerland: 'CHF',
  taiwan: 'TWD',
  thailand: 'THB',
  turkey: 'TRY',
  uae: 'AED',
  vietnam: 'VND',
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
  DZD: { code: 'DZD', symbol: 'د.ج', name: 'Algerian Dinar', decimals: 2 },
  ARS: { code: 'ARS', symbol: '$', name: 'Argentine Peso', decimals: 2 },
  BDT: { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka', decimals: 2 },
  CLP: { code: 'CLP', symbol: '$', name: 'Chilean Peso', decimals: 0 },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', decimals: 2 },
  COP: { code: 'COP', symbol: '$', name: 'Colombian Peso', decimals: 2 },
  CZK: { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', decimals: 2 },
  DKK: { code: 'DKK', symbol: 'kr', name: 'Danish Krone', decimals: 2 },
  EGP: { code: 'EGP', symbol: '£', name: 'Egyptian Pound', decimals: 2 },
  HKD: { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', decimals: 2 },
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', decimals: 2 },
  IRR: { code: 'IRR', symbol: '﷼', name: 'Iranian Rial', decimals: 2 },
  IQD: { code: 'IQD', symbol: 'ع.د', name: 'Iraqi Dinar', decimals: 3 },
  ILS: { code: 'ILS', symbol: '₪', name: 'Israeli Shekel', decimals: 2 },
  KZT: { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge', decimals: 2 },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', decimals: 2 },
  MXN: { code: 'MXN', symbol: '$', name: 'Mexican Peso', decimals: 2 },
  NOK: { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', decimals: 2 },
  PKR: { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee', decimals: 2 },
  PEN: { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', decimals: 2 },
  PHP: { code: 'PHP', symbol: '₱', name: 'Philippine Peso', decimals: 2 },
  PLN: { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', decimals: 2 },
  RON: { code: 'RON', symbol: 'lei', name: 'Romanian Leu', decimals: 2 },
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', decimals: 2 },
  SAR: { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal', decimals: 2 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', decimals: 2 },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', decimals: 2 },
  KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won', decimals: 0 },
  SEK: { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', decimals: 2 },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', decimals: 2 },
  TWD: { code: 'TWD', symbol: 'NT$', name: 'Taiwan Dollar', decimals: 2 },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', decimals: 2 },
  TRY: { code: 'TRY', symbol: '₺', name: 'Turkish Lira', decimals: 2 },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', decimals: 2 },
  VND: { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', decimals: 0 },
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
